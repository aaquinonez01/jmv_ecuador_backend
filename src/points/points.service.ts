import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { User } from 'src/auth/entities/user';
import { Comunidad } from 'src/comunidades/entities/comunidad.entity';
import {
  PointReason,
  PointsRule,
  PointsTransaction,
} from './entities/points.entities';
import {
  AdjustPointsDto,
  ListMembersDto,
  MemberRequestDto,
  ReviewMemberDto,
  UpdateRulesDto,
} from './dto/points.dto';

const PAGE_SIZE = 30;
// Inicio del día de hoy en Ecuador, para los topes diarios
const TODAY_EC = `(date_trunc('day', now() AT TIME ZONE 'America/Guayaquil') AT TIME ZONE 'America/Guayaquil')`;

export interface AwardInput {
  userId: string;
  amount: number;
  reason: PointReason;
  description: string;
  /** Si se repite (usuario, motivo, refId) no se vuelve a pagar */
  refId?: string | null;
  createdById?: string | null;
  /** Tope diario para este motivo (clave de points_rules) */
  dailyCapKey?: string;
}

const memberView = (u: User) => ({
  id: u.id,
  fullName: u.fullName,
  displayName: u.displayName,
  email: u.email,
  profilePicture: u.profilePicture,
  level: u.level ?? null,
  memberStatus: u.memberStatus,
  memberRequestedAt: u.memberRequestedAt ?? null,
  memberVerifiedAt: u.memberVerifiedAt ?? null,
  pointsBalance: u.pointsBalance,
  comunidad: u.comunidad
    ? {
        id: u.comunidad.id,
        nombre: u.comunidad.nombre,
        zona: u.comunidad.zona?.nombre ?? null,
      }
    : null,
});

@Injectable()
export class PointsService {
  private readonly logger = new Logger('PointsService');

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Comunidad)
    private readonly comunidades: Repository<Comunidad>,
    @InjectRepository(PointsTransaction)
    private readonly txs: Repository<PointsTransaction>,
    @InjectRepository(PointsRule)
    private readonly rules: Repository<PointsRule>,
  ) {}

  // ── Reglas ──────────────────────────────────────────────────────────────

  getRules() {
    return this.rules.find({ order: { displayOrder: 'ASC' } });
  }

  async ruleValues(): Promise<Record<string, number>> {
    const list = await this.getRules();
    return Object.fromEntries(list.map((r) => [r.key, r.points]));
  }

  async updateRules(dto: UpdateRulesDto) {
    await this.dataSource.transaction(async (m) => {
      for (const r of dto.rules) {
        await m.update(PointsRule, { key: r.key }, { points: r.points });
      }
    });
    return this.getRules();
  }

  // ── Movimientos ─────────────────────────────────────────────────────────

  /** Suma (o resta) puntos de forma atómica e idempotente. Devuelve lo realmente acreditado. */
  async award(input: AwardInput, manager?: EntityManager): Promise<number> {
    const run = async (m: EntityManager) => {
      // Bloquea la fila del usuario para que dos premios simultáneos no se pisen
      const [user]: { pointsBalance: number }[] = await m.query(
        `SELECT "pointsBalance" FROM "user" WHERE id = $1 FOR UPDATE`,
        [input.userId],
      );
      if (!user) return 0;

      let amount = input.amount;
      if (input.dailyCapKey && amount > 0) {
        const [rule]: { points: number }[] = await m.query(
          `SELECT points FROM points_rules WHERE key = $1`,
          [input.dailyCapKey],
        );
        if (rule) {
          const [{ total }]: { total: number }[] = await m.query(
            `SELECT COALESCE(SUM(amount), 0)::int AS total FROM points_transactions
             WHERE "userId" = $1 AND reason = $2 AND amount > 0 AND "createdAt" >= ${TODAY_EC}`,
            [input.userId, input.reason],
          );
          amount = Math.min(amount, Math.max(0, rule.points - total));
        }
      }
      // Nunca deja el saldo en negativo
      if (amount < 0) amount = Math.max(amount, -user.pointsBalance);
      if (amount === 0) return 0;

      const inserted: { id: string }[] = await m.query(
        `INSERT INTO points_transactions ("userId", amount, reason, description, "refId", "createdById")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING RETURNING id`,
        [
          input.userId,
          amount,
          input.reason,
          input.description,
          input.refId ?? null,
          input.createdById ?? null,
        ],
      );
      if (inserted.length === 0) return 0;
      await m.query(
        `UPDATE "user" SET "pointsBalance" = "pointsBalance" + $2 WHERE id = $1`,
        [input.userId, amount],
      );
      return amount;
    };
    return manager ? run(manager) : this.dataSource.transaction(run);
  }

  /**
   * Premia una sesión terminada de quiz en vivo. `ranking` en orden final.
   * Participación: quien respondió al menos una pregunta. Podio: solo con 3+ participantes.
   * Nunca lanza: si algo falla, el quiz termina igual.
   */
  async awardQuizSession(
    sessionId: string,
    quizTitle: string,
    ranking: { userId: string }[],
  ) {
    const awarded = new Map<string, number>();
    try {
      const rows: { userId: string; answers: number }[] =
        await this.dataSource.query(
          `SELECT p."userId", COUNT(a.id)::int AS answers
         FROM quiz_session_participants p
         LEFT JOIN quiz_session_answers a ON a."participantId" = p.id
         WHERE p."sessionId" = $1 GROUP BY p."userId"`,
          [sessionId],
        );
      const answered = new Set(
        rows.filter((r) => r.answers > 0).map((r) => r.userId),
      );
      const active = ranking.filter((r) => answered.has(r.userId));
      const rules = await this.ruleValues();
      const podium = [
        rules.quiz_primero ?? 0,
        rules.quiz_segundo ?? 0,
        rules.quiz_tercero ?? 0,
      ];

      for (const [i, r] of active.entries()) {
        const bonus = active.length >= 3 && i < 3 ? podium[i] : 0;
        const amount = (rules.quiz_participacion ?? 0) + bonus;
        if (amount <= 0) continue;
        const place = bonus ? ` (${i + 1}.º lugar)` : '';
        const got = await this.award({
          userId: r.userId,
          amount,
          reason: 'quiz_live',
          description: `Quiz en vivo: ${quizTitle}${place}`,
          refId: sessionId,
          dailyCapKey: 'quiz_tope_diario',
        });
        awarded.set(r.userId, got);
      }
    } catch (e) {
      this.logger.error(
        `No se pudieron dar los puntos del quiz ${sessionId}`,
        e as Error,
      );
    }
    return awarded;
  }

  // ── App ─────────────────────────────────────────────────────────────────

  async mine(userId: string, page = 1) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const [items, total] = await this.txs.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return {
      member: memberView(user),
      transactions: items.map(
        ({ id, amount, reason, description, createdAt }) => ({
          id,
          amount,
          reason,
          description,
          createdAt,
        }),
      ),
      page,
      hasMore: page * PAGE_SIZE < total,
    };
  }

  async requestMembership(userId: string, dto: MemberRequestDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.memberStatus === 'verified')
      throw new BadRequestException(
        'Ya eres miembro verificado. Si cambiaste de comunidad, avisa al Consejo.',
      );
    const comunidad = await this.comunidades.findOne({
      where: { id: dto.comunidadId },
    });
    if (!comunidad) throw new BadRequestException('Comunidad no encontrada');
    user.comunidad = comunidad;
    user.level = dto.level;
    user.memberStatus = 'pending';
    user.memberRequestedAt = new Date();
    await this.users.save(user);
    return memberView(user);
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  async listMembers(q: ListMembersDto) {
    const page = q.page ?? 1;
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.comunidad', 'c')
      .leftJoinAndSelect('c.zona', 'z')
      .where('u.role = :role', { role: 'user' });
    if (q.status) qb.andWhere('u.memberStatus = :status', { status: q.status });
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('u.fullName ILIKE :s', { s })
            .orWhere('u.displayName ILIKE :s', { s })
            .orWhere('u.email ILIKE :s', { s })
            .orWhere('c.nombre ILIKE :s', { s }),
        ),
      );
    }
    qb.orderBy(
      q.status === 'pending' ? 'u.memberRequestedAt' : 'u.fullName',
      'ASC',
    )
      .skip((page - 1) * PAGE_SIZE)
      .take(PAGE_SIZE);
    const [items, total] = await qb.getManyAndCount();
    const [{ pending }]: { pending: number }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS pending FROM "user" WHERE "memberStatus" = 'pending'`,
    );
    return {
      items: items.map(memberView),
      total,
      page,
      pageSize: PAGE_SIZE,
      pending,
    };
  }

  async reviewMember(id: string, dto: ReviewMemberDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (dto.comunidadId) {
      const comunidad = await this.comunidades.findOne({
        where: { id: dto.comunidadId },
      });
      if (!comunidad) throw new BadRequestException('Comunidad no encontrada');
      user.comunidad = comunidad;
    }
    if (dto.level) user.level = dto.level;
    user.memberStatus = dto.status;
    user.memberVerifiedAt = dto.status === 'verified' ? new Date() : null;
    await this.users.save(user);
    return memberView(user);
  }

  async adjust(id: string, dto: AdjustPointsDto, adminId: string) {
    const exists = await this.users.exists({ where: { id } });
    if (!exists) throw new NotFoundException('Usuario no encontrado');
    const applied = await this.award({
      userId: id,
      amount: dto.amount,
      reason: 'admin',
      description: dto.description.trim(),
      createdById: adminId,
    });
    if (applied === 0)
      throw new BadRequestException(
        'No se aplicó: el saldo no puede quedar en negativo.',
      );
    const user = await this.users.findOneOrFail({ where: { id } });
    return { applied, member: memberView(user) };
  }

  async userTransactions(id: string, page = 1) {
    return this.mine(id, page);
  }
}
