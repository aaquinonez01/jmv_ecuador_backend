import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { PointsService } from 'src/points/points.service';
import { PushService } from 'src/push/push.service';
import {
  ANSWER_GRACE_SECONDS,
  ANSWER_SECONDS,
  GAME_CATEGORIES,
  MAX_ACTIVE_MATCHES,
  MAX_ROUNDS,
  METER_FULL,
  TURN_TIMEOUT_HOURS,
  WAITING_DAYS,
} from './game.constants';
import { AnswerDto, CreateMatchDto } from './dto/game.dto';

export interface MatchRow {
  id: string;
  playerAId: string;
  playerBId: string | null;
  mode: 'friend' | 'random';
  status: 'active' | 'waiting' | 'finished';
  turnUserId: string | null;
  round: number;
  crownsA: string[];
  crownsB: string[];
  meterA: number;
  meterB: number;
  correctA: number;
  correctB: number;
  crownPendingFor: string | null;
  winnerId: string | null;
  endReason: string | null;
  lastMoveAt: Date;
  createdAt: Date;
  finishedAt: Date | null;
}

export interface TurnRow {
  id: string;
  matchId: string;
  userId: string;
  questionId: string;
  category: string;
  isCrown: boolean;
  issuedAt: Date;
  answeredAt: Date | null;
  chosenIndex: number | null;
  correct: boolean | null;
}

export interface PlayerRow {
  id: string;
  name: string;
  avatar: string | null;
  level: string | null;
  comunidad: string | null;
}

type Effect = () => Promise<unknown>;

const expiresAt = (t: TurnRow) =>
  new Date(new Date(t.issuedAt).getTime() + ANSWER_SECONDS * 1000);
const isExpired = (t: TurnRow) =>
  Date.now() >
  new Date(t.issuedAt).getTime() +
    (ANSWER_SECONDS + ANSWER_GRACE_SECONDS) * 1000;

// Gira y Aprende: partidas por turnos. El servidor decide la categoría,
// entrega la pregunta sin la respuesta y valida respuesta y tiempo.
@Injectable()
export class GameService {
  private readonly logger = new Logger('GameService');

  constructor(
    private readonly dataSource: DataSource,
    private readonly points: PointsService,
    private readonly push: PushService,
  ) {}

  // ── Utilidades ──────────────────────────────────────────────────────────

  private async tx<T>(
    fn: (m: EntityManager, effects: Effect[]) => Promise<T>,
  ): Promise<T> {
    const effects: Effect[] = [];
    const result = await this.dataSource.transaction((m) => fn(m, effects));
    // Puntos, estrellas y avisos: después de confirmar la transacción, sin romper la jugada si fallan
    for (const e of effects)
      await e().catch((err) => this.logger.warn((err as Error).message));
    return result;
  }

  private async lockMatch(
    m: EntityManager,
    id: string,
    me: string,
  ): Promise<MatchRow> {
    const [row]: MatchRow[] = await m.query(
      `SELECT * FROM game_matches WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!row) throw new NotFoundException('Partida no encontrada');
    if (row.playerAId !== me && row.playerBId !== me)
      throw new ForbiddenException('No juegas en esta partida');
    return row;
  }

  private side(match: MatchRow, me: string): 'A' | 'B' {
    return match.playerAId === me ? 'A' : 'B';
  }

  private async save(m: EntityManager, x: MatchRow) {
    await m.query(
      `UPDATE game_matches SET "playerBId" = $2, status = $3, "turnUserId" = $4, round = $5, "crownsA" = $6, "crownsB" = $7,
         "meterA" = $8, "meterB" = $9, "correctA" = $10, "correctB" = $11, "crownPendingFor" = $12, "winnerId" = $13,
         "endReason" = $14, "lastMoveAt" = $15, "finishedAt" = $16
       WHERE id = $1`,
      [
        x.id,
        x.playerBId,
        x.status,
        x.turnUserId,
        x.round,
        JSON.stringify(x.crownsA),
        JSON.stringify(x.crownsB),
        x.meterA,
        x.meterB,
        x.correctA,
        x.correctB,
        x.crownPendingFor,
        x.winnerId,
        x.endReason,
        x.lastMoveAt,
        x.finishedAt,
      ],
    );
  }

  private async players(
    ids: (string | null)[],
  ): Promise<Map<string, PlayerRow>> {
    const list = ids.filter((x): x is string => Boolean(x));
    if (!list.length) return new Map();
    const rows: PlayerRow[] = await this.dataSource.query(
      `SELECT u.id, COALESCE(NULLIF(u."displayName", ''), u."fullName") AS name, u."profilePicture" AS avatar,
              u.level, c.nombre AS comunidad
       FROM "user" u LEFT JOIN comunidades c ON c.id = u."comunidadId" WHERE u.id = ANY($1::uuid[])`,
      [list],
    );
    return new Map(rows.map((r) => [r.id, r]));
  }

  private async name(id: string) {
    return (await this.players([id])).get(id)?.name ?? 'Tu rival';
  }

  /** Categorías que tienen al menos una pregunta aprobada */
  private async availableCategories(
    m: EntityManager | DataSource = this.dataSource,
  ): Promise<string[]> {
    const rows: { category: string }[] = await m.query(
      `SELECT DISTINCT category FROM game_questions WHERE status = 'approved' AND deleted = false`,
    );
    const set = new Set(rows.map((r) => r.category));
    return GAME_CATEGORIES.filter((c) => set.has(c));
  }

  private async addStars(userId: string, n: number): Promise<number> {
    if (n <= 0) return 0;
    return this.dataSource.transaction(async (m) => {
      const [rule]: { points: number }[] = await m.query(
        `SELECT points FROM points_rules WHERE key = 'estrellas_tope_diario'`,
      );
      const cap = rule?.points ?? 100;
      const day = `(now() AT TIME ZONE 'America/Guayaquil')::date`;
      await m.query(
        `INSERT INTO game_star_days ("userId", day, stars) VALUES ($1, ${day}, 0) ON CONFLICT DO NOTHING`,
        [userId],
      );
      const [{ stars }]: { stars: number }[] = await m.query(
        `SELECT stars FROM game_star_days WHERE "userId" = $1 AND day = ${day} FOR UPDATE`,
        [userId],
      );
      const granted = Math.max(0, Math.min(n, cap - stars));
      if (granted > 0) {
        await m.query(
          `UPDATE game_star_days SET stars = stars + $2 WHERE "userId" = $1 AND day = ${day}`,
          [userId, granted],
        );
        await m.query(
          `UPDATE "user" SET "starsBalance" = "starsBalance" + $2 WHERE id = $1`,
          [userId, granted],
        );
      }
      return granted;
    });
  }

  // ── Fin de partida ──────────────────────────────────────────────────────

  private finish(
    x: MatchRow,
    winnerId: string | null,
    reason: string,
    effects: Effect[],
  ) {
    x.status = 'finished';
    x.winnerId = winnerId;
    x.endReason = reason;
    x.turnUserId = null;
    x.crownPendingFor = null;
    x.finishedAt = new Date();
    if (!x.playerBId) return; // nadie más jugó: no hay premios
    const players = [x.playerAId, x.playerBId];
    const completed =
      reason === 'crowns' || reason === 'rounds' || reason === 'draw';
    effects.push(async () => {
      const rules = await this.points.ruleValues();
      for (const p of players) {
        const won = p === winnerId;
        const amount = won
          ? (rules.ruleta_victoria ?? 0)
          : completed
            ? (rules.ruleta_partida ?? 0)
            : 0;
        if (amount <= 0) continue;
        await this.points.award({
          userId: p,
          amount,
          reason: 'game',
          description: won
            ? 'Gira y Aprende: ganaste una partida'
            : 'Gira y Aprende: partida terminada',
          refId: x.id,
          dailyCapKey: 'ruleta_tope_diario',
        });
      }
    });
    const other = (p: string) =>
      p === x.playerAId ? x.playerBId! : x.playerAId;
    effects.push(async () => {
      for (const p of players) {
        const rival = await this.name(other(p));
        const body =
          winnerId === null
            ? `Empataste con ${rival}.`
            : winnerId === p
              ? `¡Le ganaste a ${rival}!`
              : `${rival} ganó esta vez. ¡Pide la revancha!`;
        this.push.notify([p], {
          title: 'Gira y Aprende terminó',
          body,
          data: { screen: `/ruleta/${x.id}` },
        });
      }
    });
  }

  private finishByRounds(x: MatchRow, effects: Effect[]) {
    const a = [x.crownsA.length, x.correctA];
    const b = [x.crownsB.length, x.correctB];
    const winner =
      a[0] !== b[0]
        ? a[0] > b[0]
          ? x.playerAId
          : x.playerBId
        : a[1] !== b[1]
          ? a[1] > b[1]
            ? x.playerAId
            : x.playerBId
          : null;
    this.finish(x, winner, winner ? 'rounds' : 'draw', effects);
  }

  /** Pasa el turno al rival (o deja la partida esperando rival si es al azar) */
  private endTurn(x: MatchRow, me: string, effects: Effect[]) {
    x.crownPendingFor = null;
    if (this.side(x, me) === 'A') {
      if (!x.playerBId) {
        x.status = 'waiting';
        x.turnUserId = null;
        return;
      }
      x.turnUserId = x.playerBId;
    } else {
      x.turnUserId = x.playerAId;
      x.round += 1;
      if (x.round > MAX_ROUNDS) return this.finishByRounds(x, effects);
    }
    const next = x.turnUserId;
    effects.push(async () => {
      this.push.notify([next], {
        title: '¡Te toca en Gira y Aprende!',
        body: `${await this.name(me)} ya jugó su turno.`,
        data: { screen: `/ruleta/${x.id}` },
      });
    });
  }

  /** Cierra partidas abandonadas (72 h sin jugar su turno) o al azar sin rival (7 días) */
  private async expireStale(userId: string) {
    const stale: MatchRow[] = await this.dataSource.query(
      `SELECT * FROM game_matches
       WHERE ("playerAId" = $1 OR "playerBId" = $1)
         AND ((status = 'active' AND "lastMoveAt" < now() - interval '${TURN_TIMEOUT_HOURS} hours')
           OR (status = 'waiting' AND "createdAt" < now() - interval '${WAITING_DAYS} days'))`,
      [userId],
    );
    for (const s of stale) {
      await this.tx(async (m, effects) => {
        const x = await this.lockMatch(m, s.id, userId);
        if (x.status === 'finished') return;
        if (!x.playerBId || x.status === 'waiting')
          this.finish(x, null, 'expired', effects);
        else
          this.finish(
            x,
            x.turnUserId === x.playerAId ? x.playerBId : x.playerAId,
            'timeout',
            effects,
          );
        await this.save(m, x);
      });
    }
  }

  // ── Estado para la app ──────────────────────────────────────────────────

  private questionPayload(
    t: TurnRow,
    q: { prompt: string; options: string[] },
  ) {
    return {
      turnId: t.id,
      category: t.category,
      isCrown: t.isCrown,
      prompt: q.prompt,
      options: q.options,
      expiresAt: expiresAt(t),
      seconds: ANSWER_SECONDS,
    };
  }

  private async view(x: MatchRow, me: string) {
    const ps = await this.players([x.playerAId, x.playerBId]);
    const mine = this.side(x, me) === 'A';
    const sideOf = (s: 'A' | 'B') => ({
      player:
        (s === 'A'
          ? ps.get(x.playerAId)
          : x.playerBId
            ? ps.get(x.playerBId)
            : null) ?? null,
      crowns: s === 'A' ? x.crownsA : x.crownsB,
      meter: s === 'A' ? x.meterA : x.meterB,
      correct: s === 'A' ? x.correctA : x.correctB,
    });
    const myTurn = x.status === 'active' && x.turnUserId === me;
    return {
      id: x.id,
      mode: x.mode,
      status: x.status,
      round: Math.min(x.round, MAX_ROUNDS),
      maxRounds: MAX_ROUNDS,
      me: sideOf(mine ? 'A' : 'B'),
      opponent: sideOf(mine ? 'B' : 'A'),
      myTurn,
      crownChoice: myTurn && x.crownPendingFor === me,
      winnerId: x.winnerId,
      result:
        x.status !== 'finished'
          ? null
          : x.winnerId === null
            ? 'draw'
            : x.winnerId === me
              ? 'won'
              : 'lost',
      endReason: x.endReason,
      lastMoveAt: x.lastMoveAt,
      turnDeadline:
        x.status === 'active'
          ? new Date(
              new Date(x.lastMoveAt).getTime() + TURN_TIMEOUT_HOURS * 3600_000,
            )
          : null,
    };
  }

  // ── Partidas ────────────────────────────────────────────────────────────

  async list(me: string) {
    await this.expireStale(me);
    const rows: MatchRow[] = await this.dataSource.query(
      `SELECT * FROM game_matches
       WHERE ("playerAId" = $1 OR "playerBId" = $1)
         AND (status <> 'finished' OR "finishedAt" > now() - interval '14 days')
       ORDER BY (status = 'active' AND "turnUserId" = $1) DESC, (status = 'finished') ASC, "lastMoveAt" DESC
       LIMIT 40`,
      [me],
    );
    const items = await Promise.all(rows.map((r) => this.view(r, me)));
    const [stats]: {
      stars: number;
      points: number;
      won: number;
      played: number;
    }[] = await this.dataSource.query(
      `SELECT u."starsBalance" AS stars, u."pointsBalance" AS points,
         (SELECT COUNT(*)::int FROM game_matches WHERE "winnerId" = $1) AS won,
         (SELECT COUNT(*)::int FROM game_matches WHERE status = 'finished' AND "playerBId" IS NOT NULL
            AND ("playerAId" = $1 OR "playerBId" = $1)) AS played
       FROM "user" u WHERE u.id = $1`,
      [me],
    );
    return { items, stats, categories: await this.availableCategories() };
  }

  async get(me: string, id: string) {
    await this.expireStale(me);
    const [x]: MatchRow[] = await this.dataSource.query(
      `SELECT * FROM game_matches WHERE id = $1`,
      [id],
    );
    if (!x || (x.playerAId !== me && x.playerBId !== me))
      throw new NotFoundException('Partida no encontrada');
    const state = await this.view(x, me);
    // Pregunta en curso (si cerró la app a mitad de pregunta, sigue la misma: no se puede volver a girar)
    let pending: ReturnType<GameService['questionPayload']> | null = null;
    if (state.myTurn) {
      const [t]: TurnRow[] = await this.dataSource.query(
        `SELECT * FROM game_turns WHERE "matchId" = $1 AND "userId" = $2 AND "answeredAt" IS NULL ORDER BY "issuedAt" DESC LIMIT 1`,
        [id, me],
      );
      if (t && !isExpired(t)) {
        const [q]: { prompt: string; options: string[] }[] =
          await this.dataSource.query(
            `SELECT prompt, options FROM game_questions WHERE id = $1`,
            [t.questionId],
          );
        pending = this.questionPayload(t, q);
      }
    }
    const history: {
      userId: string;
      category: string;
      isCrown: boolean;
      correct: boolean | null;
      answeredAt: Date;
    }[] = await this.dataSource.query(
      `SELECT "userId", category, "isCrown", correct, "answeredAt" FROM game_turns
         WHERE "matchId" = $1 AND "answeredAt" IS NOT NULL ORDER BY "answeredAt" DESC LIMIT 12`,
      [id],
    );
    const crownChoices = state.crownChoice
      ? (await this.availableCategories()).filter(
          (c) => !state.me.crowns.includes(c),
        )
      : [];
    return {
      ...state,
      pending,
      crownChoices,
      history: history.map((h) => ({
        mine: h.userId === me,
        category: h.category,
        isCrown: h.isCrown,
        correct: h.correct,
      })),
    };
  }

  async create(me: string, dto: CreateMatchDto) {
    const [{ n }]: { n: number }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM game_matches WHERE status <> 'finished' AND ("playerAId" = $1 OR "playerBId" = $1)`,
      [me],
    );
    if (n >= MAX_ACTIVE_MATCHES)
      throw new BadRequestException(
        `Ya tienes ${MAX_ACTIVE_MATCHES} partidas en curso. Termina alguna primero.`,
      );
    if ((await this.availableCategories()).length === 0)
      throw new BadRequestException(
        'Aún no hay preguntas cargadas. ¡Vuelve pronto!',
      );

    if (dto.friendId) {
      if (dto.friendId === me)
        throw new BadRequestException('Elige a un amigo');
      const [f]: { status: string }[] = await this.dataSource.query(
        `SELECT status FROM friendships WHERE LEAST("requesterId", "addresseeId") = LEAST($1::uuid, $2::uuid)
           AND GREATEST("requesterId", "addresseeId") = GREATEST($1::uuid, $2::uuid)`,
        [me, dto.friendId],
      );
      if (f?.status !== 'accepted')
        throw new BadRequestException('Solo puedes retar a tus amigos.');
      const [open]: { id: string }[] = await this.dataSource.query(
        `SELECT id FROM game_matches WHERE status = 'active' AND mode = 'friend'
           AND (("playerAId" = $1 AND "playerBId" = $2) OR ("playerAId" = $2 AND "playerBId" = $1)) LIMIT 1`,
        [me, dto.friendId],
      );
      if (open) return { id: open.id, existing: true };
      const [row]: { id: string }[] = await this.dataSource.query(
        `INSERT INTO game_matches ("playerAId", "playerBId", mode, "turnUserId") VALUES ($1, $2, 'friend', $1) RETURNING id`,
        [me, dto.friendId],
      );
      this.push.notify([dto.friendId], {
        title: 'Te retaron en Gira y Aprende',
        body: `${await this.name(me)} empezó una partida contigo.`,
        data: { screen: `/ruleta/${row.id}` },
      });
      return { id: row.id, existing: false };
    }

    if (!dto.random)
      throw new BadRequestException('Elige un amigo o una partida al azar');
    // Al azar: se une a una partida que espera rival (sin bloqueos de por medio) o crea una nueva
    const joined = await this.tx(async (m, effects) => {
      const [w]: MatchRow[] = await m.query(
        `SELECT g.* FROM game_matches g
         WHERE g.status = 'waiting' AND g."playerAId" <> $1 AND g."playerBId" IS NULL
           AND NOT EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'blocked'
             AND LEAST(f."requesterId", f."addresseeId") = LEAST(g."playerAId", $1::uuid)
             AND GREATEST(f."requesterId", f."addresseeId") = GREATEST(g."playerAId", $1::uuid))
           AND NOT EXISTS (SELECT 1 FROM game_matches o WHERE o.status <> 'finished'
             AND ((o."playerAId" = g."playerAId" AND o."playerBId" = $1) OR (o."playerAId" = $1 AND o."playerBId" = g."playerAId")))
         ORDER BY g."createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [me],
      );
      if (!w) return null;
      w.playerBId = me;
      w.status = 'active';
      w.turnUserId = me;
      w.lastMoveAt = new Date();
      await this.save(m, w);
      effects.push(async () =>
        this.push.notify([w.playerAId], {
          title: '¡Ya tienes rival!',
          body: `${await this.name(me)} se unió a tu partida de Gira y Aprende.`,
          data: { screen: `/ruleta/${w.id}` },
        }),
      );
      return w.id;
    });
    if (joined) return { id: joined, existing: false };
    const [row]: { id: string }[] = await this.dataSource.query(
      `INSERT INTO game_matches ("playerAId", mode, "turnUserId") VALUES ($1, 'random', $1) RETURNING id`,
      [me],
    );
    return { id: row.id, existing: false };
  }

  private async issue(
    m: EntityManager,
    x: MatchRow,
    me: string,
    category: string,
    isCrown: boolean,
  ) {
    const [u]: { level: string | null }[] = await m.query(
      `SELECT level FROM "user" WHERE id = $1`,
      [me],
    );
    const base = `status = 'approved' AND deleted = false AND category = $1`;
    const notUsed = `AND id NOT IN (SELECT "questionId" FROM game_turns WHERE "matchId" = $2)`;
    const level = u?.level
      ? `AND levels ? '${u.level.replace(/[^a-z]/g, '')}'`
      : '';
    // Primero de su sección y sin repetir; si no alcanza, se relaja
    const tries = [
      `${base} ${notUsed} ${level}`,
      `${base} ${notUsed}`,
      `${base} ${level}`,
      base,
    ];
    let q: { id: string; prompt: string; options: string[] } | undefined;
    for (const where of tries) {
      const params = where.includes('$2') ? [category, x.id] : [category];
      [q] = await m.query(
        `SELECT id, prompt, options FROM game_questions WHERE ${where} ORDER BY random() LIMIT 1`,
        params,
      );
      if (q) break;
    }
    if (!q)
      throw new BadRequestException(
        'No hay preguntas en esa categoría todavía',
      );
    const [t]: TurnRow[] = await m.query(
      `INSERT INTO game_turns ("matchId", "userId", "questionId", category, "isCrown") VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [x.id, me, q.id, category, isCrown],
    );
    return this.questionPayload(t, q);
  }

  async spin(me: string, id: string) {
    return this.tx(async (m, effects) => {
      const x = await this.lockMatch(m, id, me);
      if (x.status !== 'active' || x.turnUserId !== me)
        throw new BadRequestException('No es tu turno');
      const [pending]: TurnRow[] = await m.query(
        `SELECT * FROM game_turns WHERE "matchId" = $1 AND "userId" = $2 AND "answeredAt" IS NULL ORDER BY "issuedAt" DESC LIMIT 1 FOR UPDATE`,
        [id, me],
      );
      if (pending) {
        if (!isExpired(pending)) {
          const [q]: { prompt: string; options: string[] }[] = await m.query(
            `SELECT prompt, options FROM game_questions WHERE id = $1`,
            [pending.questionId],
          );
          return {
            type: 'question' as const,
            slot: pending.isCrown ? 'crown' : pending.category,
            question: this.questionPayload(pending, q),
          };
        }
        const r = await this.resolve(m, x, pending, null, me, effects);
        return { type: 'expired' as const, result: r };
      }
      const available = await this.availableCategories(m);
      const meSide = this.side(x, me);
      const crowns = meSide === 'A' ? x.crownsA : x.crownsB;
      const meter = meSide === 'A' ? x.meterA : x.meterB;
      const choices = available.filter((c) => !crowns.includes(c));
      if (x.crownPendingFor === me)
        return { type: 'crown' as const, slot: 'crown', choices };
      const slot = randomInt(available.length + 1);
      if (
        (meter >= METER_FULL || slot === available.length) &&
        choices.length > 0
      ) {
        x.crownPendingFor = me;
        x.lastMoveAt = new Date();
        await this.save(m, x);
        return { type: 'crown' as const, slot: 'crown', choices };
      }
      const category =
        available[
          slot === available.length ? randomInt(available.length) : slot
        ];
      const question = await this.issue(m, x, me, category, false);
      x.lastMoveAt = new Date();
      await this.save(m, x);
      return { type: 'question' as const, slot: category, question };
    });
  }

  async crown(me: string, id: string, category: string) {
    return this.tx(async (m) => {
      const x = await this.lockMatch(m, id, me);
      if (
        x.status !== 'active' ||
        x.turnUserId !== me ||
        x.crownPendingFor !== me
      )
        throw new BadRequestException('Ahora no juegas por una insignia');
      const crowns = this.side(x, me) === 'A' ? x.crownsA : x.crownsB;
      if (crowns.includes(category))
        throw new BadRequestException('Ya tienes esa insignia');
      if (!(await this.availableCategories(m)).includes(category))
        throw new BadRequestException(
          'No hay preguntas en esa categoría todavía',
        );
      x.crownPendingFor = null;
      const question = await this.issue(m, x, me, category, true);
      x.lastMoveAt = new Date();
      await this.save(m, x);
      return { type: 'question' as const, slot: category, question };
    });
  }

  async answer(me: string, id: string, dto: AnswerDto) {
    return this.tx(async (m, effects) => {
      const x = await this.lockMatch(m, id, me);
      const [t]: TurnRow[] = await m.query(
        `SELECT * FROM game_turns WHERE id = $1 AND "matchId" = $2 AND "userId" = $3 FOR UPDATE`,
        [dto.turnId, id, me],
      );
      if (!t) throw new NotFoundException('Pregunta no encontrada');
      if (t.answeredAt)
        throw new BadRequestException('Esa pregunta ya fue respondida');
      if (x.status !== 'active' || x.turnUserId !== me)
        throw new BadRequestException('No es tu turno');
      return this.resolve(m, x, t, dto.index ?? null, me, effects);
    });
  }

  private async resolve(
    m: EntityManager,
    x: MatchRow,
    t: TurnRow,
    index: number | null,
    me: string,
    effects: Effect[],
  ) {
    const [q]: {
      correctIndex: number;
      explanation: string | null;
      source: string | null;
    }[] = await m.query(
      `SELECT "correctIndex", explanation, source FROM game_questions WHERE id = $1`,
      [t.questionId],
    );
    const timedOut = isExpired(t);
    const correct = !timedOut && index !== null && index === q.correctIndex;
    await m.query(
      `UPDATE game_turns SET "answeredAt" = now(), "chosenIndex" = $2, correct = $3 WHERE id = $1`,
      [t.id, index, correct],
    );

    const A = this.side(x, me) === 'A';
    let wonCrown: string | null = null;
    if (correct) {
      if (A) x.correctA += 1;
      else x.correctB += 1;
      if (t.isCrown) {
        const crowns = A ? x.crownsA : x.crownsB;
        if (!crowns.includes(t.category)) crowns.push(t.category);
        wonCrown = t.category;
        if (A) x.meterA = 0;
        else x.meterB = 0;
        if (
          crowns.length >= GAME_CATEGORIES.length ||
          crowns.length >= (await this.availableCategories(m)).length
        )
          this.finish(x, me, 'crowns', effects);
      } else if (A) x.meterA = Math.min(METER_FULL, x.meterA + 1);
      else x.meterB = Math.min(METER_FULL, x.meterB + 1);
      effects.push(() => this.addStars(me, 1));
    } else {
      if (t.isCrown) {
        if (A) x.meterA = 0;
        else x.meterB = 0;
      }
      this.endTurn(x, me, effects);
    }
    x.lastMoveAt = new Date();
    await this.save(m, x);
    return {
      correct,
      timedOut,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      source: q.source,
      wonCrown,
      turnContinues: correct && x.status === 'active',
      state: await this.view(x, me),
    };
  }

  async resign(me: string, id: string) {
    return this.tx(async (m, effects) => {
      const x = await this.lockMatch(m, id, me);
      if (x.status === 'finished')
        throw new BadRequestException('La partida ya terminó');
      if (!x.playerBId) this.finish(x, null, 'resign', effects);
      else
        this.finish(
          x,
          x.playerAId === me ? x.playerBId : x.playerAId,
          'resign',
          effects,
        );
      await this.save(m, x);
      return this.view(x, me);
    });
  }

  /** Práctica sin conexión: solo da estrellas (no Puntos JMV), con tope diario */
  async practice(me: string, correct: number, total: number) {
    if (correct > total)
      throw new BadRequestException('Datos de práctica no válidos');
    const granted = await this.addStars(me, correct);
    const [u]: { starsBalance: number }[] = await this.dataSource.query(
      `SELECT "starsBalance" FROM "user" WHERE id = $1`,
      [me],
    );
    return { granted, starsBalance: u?.starsBalance ?? 0 };
  }
}
