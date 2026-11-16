import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/auth/entities/user';
import {
  deleteImageByPublicId,
  uploadImageWithPublicId,
} from 'src/helpers/file-upload.helper';
import { PointsService } from 'src/points/points.service';
import {
  AnswersDto,
  LeadsQueryDto,
  UpdateDayDto,
  UpdateFiestaDto,
} from './dto/fiesta.dto';
import {
  Fiesta,
  FiestaCommunityMode,
  FiestaDay,
  FiestaEntry,
  FiestaMode,
  FiestaPhoto,
  PhotoStatus,
  Reaction,
  REACTIONS,
} from './entities/fiesta.entities';

/** Fotos que cada comunidad puede tener por día (sin contar las rechazadas) */
const MAX_PHOTOS_PER_DAY = 10;

/** Valores por defecto si aún no están en points_rules */
const DEFAULT_RULES = {
  fiesta_pregunta: 10,
  fiesta_a_tiempo: 5,
  fiesta_proposito: 5,
  fiesta_mural: 20,
};

/** Fecha de hoy en Ecuador (AAAA-MM-DD) */
export function todayEc(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
  }).format(new Date());
}

/** "Katty María Pérez" → "Katty P." (el ranking es público) */
function shortName(fullName?: string | null, displayName?: string | null) {
  if (displayName?.trim()) return displayName.trim();
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Participante';
  if (parts.length === 1) return parts[0];
  // Dos nombres y dos apellidos: el apellido suele ser el tercero
  const last = parts.length >= 4 ? parts[2] : parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

/**
 * UPDATE/DELETE con RETURNING: TypeORM (postgres) devuelve [filas, cantidad];
 * un SELECT devuelve solo las filas. Normaliza a las filas.
 */
function returned<T = unknown>(res: unknown): T[] {
  if (
    Array.isArray(res) &&
    res.length === 2 &&
    Array.isArray(res[0]) &&
    typeof res[1] === 'number'
  )
    return res[0] as T[];
  return (res as T[]) ?? [];
}

type DayState = 'locked' | 'open' | 'soon';

@Injectable()
export class FiestasService {
  private readonly logger = new Logger('FiestasService');

  constructor(
    private readonly dataSource: DataSource,
    private readonly points: PointsService,
    @InjectRepository(Fiesta) private readonly fiestas: Repository<Fiesta>,
    @InjectRepository(FiestaDay) private readonly days: Repository<FiestaDay>,
    @InjectRepository(FiestaEntry)
    private readonly entries: Repository<FiestaEntry>,
    @InjectRepository(FiestaPhoto)
    private readonly photos: Repository<FiestaPhoto>,
    @InjectRepository(FiestaCommunityMode)
    private readonly modes: Repository<FiestaCommunityMode>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // ── Ayudas ────────────────────────────────────────────────────────────

  private async rules() {
    const values = await this.points.ruleValues();
    return {
      pregunta: values.fiesta_pregunta ?? DEFAULT_RULES.fiesta_pregunta,
      aTiempo: values.fiesta_a_tiempo ?? DEFAULT_RULES.fiesta_a_tiempo,
      proposito: values.fiesta_proposito ?? DEFAULT_RULES.fiesta_proposito,
      mural: values.fiesta_mural ?? DEFAULT_RULES.fiesta_mural,
    };
  }

  private async fiestaBySlug(slug: string) {
    const fiesta = await this.fiestas.findOne({
      where: { slug, published: true },
    });
    if (!fiesta) throw new NotFoundException('No encontramos esta fiesta.');
    return fiesta;
  }

  private dayState(day: FiestaDay, today: string): DayState {
    if (day.date > today) return 'locked';
    return day.published ? 'open' : 'soon';
  }

  /**
   * Día abierto y con contenido publicado; si no, error claro.
   * `preview`: los administradores pueden abrir cualquier día para probarlo.
   */
  private async openDay(slug: string, n: number, preview = false) {
    const fiesta = await this.fiestaBySlug(slug);
    const day = await this.days.findOne({
      where: { fiesta: { id: fiesta.id }, dayNumber: n },
    });
    if (!day) throw new NotFoundException('Este día no existe.');
    if (preview) return { fiesta, day };
    const state = this.dayState(day, todayEc());
    if (state === 'locked')
      throw new ForbiddenException('Este día todavía no empieza.');
    if (state === 'soon')
      throw new ForbiddenException(
        'El contenido de este día está en preparación.',
      );
    return { fiesta, day };
  }

  private async loadUser(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  private async requireLead(userId: string) {
    const user = await this.loadUser(userId);
    if (!user.isCommunityLead || !user.comunidad) {
      throw new ForbiddenException(
        'Solo el responsable de la comunidad puede hacer esto.',
      );
    }
    return user as User & { comunidad: NonNullable<User['comunidad']> };
  }

  private resultView(day: FiestaDay, entry: FiestaEntry) {
    return {
      correct: entry.correct,
      total: entry.total,
      points: entry.points,
      onTime: entry.onTime,
      purposeDone: entry.purposeDone,
      questions: day.questions.map((q, i) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? null,
        yours: entry.answers?.[i] ?? null,
      })),
    };
  }

  // ── Público ───────────────────────────────────────────────────────────

  /** Portada de la fiesta: días con su estado (sin el contenido de los que no empiezan) */
  async getPublic(slug: string) {
    const fiesta = await this.fiestaBySlug(slug);
    const today = todayEc();
    const days = await this.days.find({
      where: { fiesta: { id: fiesta.id } },
      order: { dayNumber: 'ASC' },
    });
    const [{ participants, comunidades }]: {
      participants: number;
      comunidades: number;
    }[] = await this.dataSource.query(
      `SELECT COUNT(DISTINCT e."userId")::int AS participants,
              COUNT(DISTINCT u."comunidadId")::int AS comunidades
         FROM fiesta_entries e
         JOIN fiesta_days d ON d.id = e."dayId"
         JOIN "user" u ON u.id = e."userId"
        WHERE d."fiestaId" = $1 AND u.role <> 'admin'`,
      [fiesta.id],
    );
    return {
      id: fiesta.id,
      slug: fiesta.slug,
      title: fiesta.title,
      subtitle: fiesta.subtitle ?? null,
      intro: fiesta.intro ?? null,
      feastDate: fiesta.feastDate,
      today,
      participants,
      comunidades,
      days: days.map((d) => {
        const state = this.dayState(d, today);
        return {
          dayNumber: d.dayNumber,
          label: d.label,
          date: d.date,
          piece: d.piece,
          state,
          isToday: d.date === today,
          title: state === 'open' ? d.title : null,
          questionCount: state === 'open' ? d.questions.length : 0,
          hasPurpose: state === 'open' && Boolean(d.purpose),
        };
      }),
    };
  }

  /** Contenido del día (sin las respuestas correctas) */
  async getDay(slug: string, n: number, preview = false) {
    const { fiesta, day } = await this.openDay(slug, n, preview);
    return {
      dailyPrayers: fiesta.dailyPrayers ?? null,
      dayNumber: day.dayNumber,
      label: day.label,
      date: day.date,
      isToday: day.date === todayEc(),
      title: day.title,
      piece: day.piece,
      theme: day.theme ?? null,
      prayer: day.prayer ?? null,
      purpose: day.purpose ?? null,
      source: day.source ?? null,
      questions: day.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
      })),
    };
  }

  /** Mi avance en la fiesta */
  async me(slug: string, userId: string) {
    const fiesta = await this.fiestaBySlug(slug);
    const user = await this.loadUser(userId);
    const rows: {
      dayNumber: number;
      answered: boolean;
      correct: number;
      total: number;
      purposeDone: boolean;
      points: number;
    }[] = await this.dataSource.query(
      `SELECT d."dayNumber", (e.answers IS NOT NULL) AS answered, e.correct, e.total,
              e."purposeDone", e.points
         FROM fiesta_entries e
         JOIN fiesta_days d ON d.id = e."dayId"
        WHERE d."fiestaId" = $1 AND e."userId" = $2
        ORDER BY d."dayNumber"`,
      [fiesta.id, userId],
    );
    const mode = user.comunidad
      ? await this.modes.findOne({
          where: { fiestaId: fiesta.id, comunidadId: user.comunidad.id },
        })
      : null;
    return {
      user: {
        id: user.id,
        name: shortName(user.fullName, user.displayName),
        isLead: Boolean(user.isCommunityLead && user.comunidad),
        isAdmin: user.role === 'admin',
      },
      comunidad: user.comunidad
        ? { id: user.comunidad.id, nombre: user.comunidad.nombre }
        : null,
      mode: mode?.mode ?? null,
      totalPoints: rows.reduce((a, r) => a + r.points, 0),
      days: rows,
    };
  }

  async answer(
    slug: string,
    n: number,
    userId: string,
    dto: AnswersDto,
    preview = false,
  ) {
    const { fiesta, day } = await this.openDay(slug, n, preview);
    if (day.questions.length === 0)
      throw new BadRequestException('Este día no tiene preguntas.');
    if (dto.answers.length !== day.questions.length)
      throw new BadRequestException('Responde todas las preguntas.');

    const rules = await this.rules();
    const correct = day.questions.reduce(
      (a, q, i) => a + (dto.answers[i] === q.correctIndex ? 1 : 0),
      0,
    );
    const onTime = day.date === todayEc();
    const earned = correct * rules.pregunta + (onTime ? rules.aTiempo : 0);

    const entry = await this.dataSource.transaction(async (m) => {
      await m.query(
        `INSERT INTO fiesta_entries ("dayId", "userId") VALUES ($1, $2)
         ON CONFLICT ("dayId", "userId") DO NOTHING`,
        [day.id, userId],
      );
      // Solo una vez: la condición "answers IS NULL" evita dobles envíos
      const updated = returned<{ id: string }>(
        await m.query(
          `UPDATE fiesta_entries
            SET answers = $3::jsonb, correct = $4, total = $5, "onTime" = $6,
                "answeredAt" = now(), points = points + $7
          WHERE "dayId" = $1 AND "userId" = $2 AND answers IS NULL
          RETURNING id`,
          [
            day.id,
            userId,
            JSON.stringify(dto.answers),
            correct,
            day.questions.length,
            onTime,
            earned,
          ],
        ),
      );
      if (updated.length === 0)
        throw new ConflictException(
          'Ya respondiste las preguntas de este día.',
        );
      // Las pruebas de los administradores no suman a su saldo
      if (earned > 0 && !preview) {
        await this.points.award(
          {
            userId,
            amount: earned,
            reason: 'fiesta',
            description: `${fiesta.title} · ${day.label}`,
            refId: updated[0].id,
          },
          m,
        );
      }
      return m.findOneOrFail(FiestaEntry, { where: { id: updated[0].id } });
    });
    return this.resultView(day, entry);
  }

  async result(slug: string, n: number, userId: string, preview = false) {
    const { day } = await this.openDay(slug, n, preview);
    const entry = await this.entries.findOne({
      where: { day: { id: day.id }, user: { id: userId } },
    });
    if (!entry) return { answered: false, purposeDone: false };
    if (!entry.answers)
      return { answered: false, purposeDone: entry.purposeDone };
    return { answered: true, ...this.resultView(day, entry) };
  }

  async purpose(slug: string, n: number, userId: string, preview = false) {
    const { fiesta, day } = await this.openDay(slug, n, preview);
    if (!day.purpose)
      throw new BadRequestException('Este día no tiene propósito.');
    const rules = await this.rules();
    return this.dataSource.transaction(async (m) => {
      await m.query(
        `INSERT INTO fiesta_entries ("dayId", "userId") VALUES ($1, $2)
         ON CONFLICT ("dayId", "userId") DO NOTHING`,
        [day.id, userId],
      );
      const updated = returned<{ id: string }>(
        await m.query(
          `UPDATE fiesta_entries
            SET "purposeDone" = true, "purposeAt" = now(), points = points + $3
          WHERE "dayId" = $1 AND "userId" = $2 AND "purposeDone" = false
          RETURNING id`,
          [day.id, userId, rules.proposito],
        ),
      );
      if (updated.length === 0) return { purposeDone: true, points: 0 };
      if (preview) return { purposeDone: true, points: rules.proposito };
      await this.points.award(
        {
          userId,
          amount: rules.proposito,
          reason: 'fiesta_proposito',
          description: `${fiesta.title} · ${day.label} · propósito`,
          refId: updated[0].id,
        },
        m,
      );
      return { purposeDone: true, points: rules.proposito };
    });
  }

  /**
   * Ranking: personas (top 10) y comunidades. Las comunidades se ordenan por el
   * promedio de puntos de quienes participaron (así una comunidad pequeña puede
   * competir con una grande) más un bono por cada día con fotos en el mural.
   */
  async ranking(slug: string) {
    const fiesta = await this.fiestaBySlug(slug);
    const rules = await this.rules();
    const people: {
      fullName: string;
      displayName: string | null;
      comunidad: string | null;
      points: number;
      days: number;
    }[] = await this.dataSource.query(
      `SELECT u."fullName", u."displayName", c.nombre AS comunidad,
              SUM(e.points)::int AS points,
              COUNT(e.answers)::int AS days
         FROM fiesta_entries e
         JOIN fiesta_days d ON d.id = e."dayId"
         JOIN "user" u ON u.id = e."userId"
         LEFT JOIN comunidades c ON c.id = u."comunidadId"
        WHERE d."fiestaId" = $1 AND u.role <> 'admin'
        GROUP BY u.id, c.nombre
       HAVING SUM(e.points) > 0
        ORDER BY points DESC, MAX(e."answeredAt") ASC
        LIMIT 10`,
      [fiesta.id],
    );
    const groups: {
      id: string;
      nombre: string;
      zona: string | null;
      participants: number;
      total: number;
      muralDays: number;
    }[] = await this.dataSource.query(
      `WITH pts AS (
         SELECT u."comunidadId" AS id, COUNT(DISTINCT e."userId")::int AS participants,
                SUM(e.points)::int AS total
           FROM fiesta_entries e
           JOIN fiesta_days d ON d.id = e."dayId"
           JOIN "user" u ON u.id = e."userId"
          WHERE d."fiestaId" = $1 AND u."comunidadId" IS NOT NULL AND u.role <> 'admin'
          GROUP BY u."comunidadId"
       ), mural AS (
         SELECT p."comunidadId" AS id, COUNT(DISTINCT p."dayId")::int AS "muralDays"
           FROM fiesta_photos p
           JOIN fiesta_days d ON d.id = p."dayId"
          WHERE d."fiestaId" = $1 AND p.status = 'approved'
          GROUP BY p."comunidadId"
       )
       SELECT c.id, c.nombre, z.nombre AS zona,
              COALESCE(pts.participants, 0) AS participants,
              COALESCE(pts.total, 0) AS total,
              COALESCE(mural."muralDays", 0) AS "muralDays"
         FROM comunidades c
         LEFT JOIN zonas z ON z.id = c."zonaId"
         LEFT JOIN pts ON pts.id = c.id
         LEFT JOIN mural ON mural.id = c.id
        WHERE pts.id IS NOT NULL OR mural.id IS NOT NULL`,
      [fiesta.id],
    );
    const comunidades = groups
      .map((g) => {
        const average = g.participants
          ? Math.round(g.total / g.participants)
          : 0;
        return {
          id: g.id,
          nombre: g.nombre,
          zona: g.zona,
          participants: g.participants,
          average,
          muralDays: g.muralDays,
          score: average + g.muralDays * rules.mural,
        };
      })
      .sort((a, b) => b.score - a.score || b.participants - a.participants);
    return {
      muralBonus: rules.mural,
      people: people.map((p) => ({
        name: shortName(p.fullName, p.displayName),
        comunidad: p.comunidad,
        points: p.points,
        days: p.days,
      })),
      comunidades,
    };
  }

  /** Administradores: borra su propio avance para volver a probar desde cero */
  async resetMine(slug: string, userId: string) {
    const fiesta = await this.fiestaBySlug(slug);
    await this.dataSource.query(
      `DELETE FROM fiesta_entries e USING fiesta_days d
        WHERE d.id = e."dayId" AND d."fiestaId" = $1 AND e."userId" = $2`,
      [fiesta.id, userId],
    );
    return { reset: true };
  }

  // ── Mural ─────────────────────────────────────────────────────────────

  async listPhotos(slug: string, dayNumber?: number) {
    const fiesta = await this.fiestaBySlug(slug);
    const params: unknown[] = [fiesta.id];
    let dayFilter = '';
    if (dayNumber) {
      params.push(dayNumber);
      dayFilter = `AND d."dayNumber" = $2`;
    }
    const rows: {
      id: string;
      url: string;
      caption: string | null;
      createdAt: Date;
      dayNumber: number;
      label: string;
      comunidad: string;
      reactions: Record<string, number> | null;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.url, p.caption, p."createdAt", d."dayNumber", d.label,
              c.nombre AS comunidad,
              (SELECT jsonb_object_agg(r.emoji, r.n) FROM (
                 SELECT emoji, COUNT(*)::int AS n FROM fiesta_photo_reactions
                  WHERE "photoId" = p.id GROUP BY emoji) r) AS reactions
         FROM fiesta_photos p
         JOIN fiesta_days d ON d.id = p."dayId"
         JOIN comunidades c ON c.id = p."comunidadId"
        WHERE d."fiestaId" = $1 AND p.status = 'approved' ${dayFilter}
        ORDER BY p."createdAt" DESC
        LIMIT 300`,
      params,
    );
    return rows.map((r) => ({ ...r, reactions: r.reactions ?? {} }));
  }

  async myReactions(slug: string, userId: string) {
    const fiesta = await this.fiestaBySlug(slug);
    const rows: { photoId: string; emoji: Reaction }[] =
      await this.dataSource.query(
        `SELECT r."photoId", r.emoji FROM fiesta_photo_reactions r
           JOIN fiesta_photos p ON p.id = r."photoId"
           JOIN fiesta_days d ON d.id = p."dayId"
          WHERE d."fiestaId" = $1 AND r."userId" = $2`,
        [fiesta.id, userId],
      );
    return rows;
  }

  /** Pone o quita una reacción. Devuelve los conteos de la foto. */
  async react(photoId: string, userId: string, emoji: Reaction) {
    if (!REACTIONS.includes(emoji)) throw new BadRequestException();
    const photo = await this.photos.findOne({
      where: { id: photoId, status: 'approved' },
    });
    if (!photo) throw new NotFoundException('La foto no existe.');
    const removed = returned(
      await this.dataSource.query(
        `DELETE FROM fiesta_photo_reactions WHERE "photoId" = $1 AND "userId" = $2 AND emoji = $3 RETURNING 1`,
        [photoId, userId, emoji],
      ),
    );
    if (removed.length === 0) {
      await this.dataSource.query(
        `INSERT INTO fiesta_photo_reactions ("photoId", "userId", emoji) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [photoId, userId, emoji],
      );
    }
    const counts: { emoji: string; n: number }[] = await this.dataSource.query(
      `SELECT emoji, COUNT(*)::int AS n FROM fiesta_photo_reactions WHERE "photoId" = $1 GROUP BY emoji`,
      [photoId],
    );
    return {
      reacted: removed.length === 0,
      reactions: Object.fromEntries(counts.map((c) => [c.emoji, c.n])),
    };
  }

  /** Responsable: sube fotos de su comunidad para un día (quedan pendientes de aprobación) */
  async uploadPhotos(
    slug: string,
    n: number,
    userId: string,
    files: Express.Multer.File[],
    caption?: string | null,
  ) {
    const user = await this.requireLead(userId);
    const fiesta = await this.fiestaBySlug(slug);
    const day = await this.days.findOne({
      where: { fiesta: { id: fiesta.id }, dayNumber: n },
    });
    if (!day) throw new NotFoundException('Este día no existe.');
    // Antes de que empiece el día solo se sube si el admin activó las pruebas
    if (day.date > todayEc() && !fiesta.earlyPhotos)
      throw new ForbiddenException('Este día todavía no empieza.');
    if (!files?.length)
      throw new BadRequestException('Elige al menos una foto.');

    const [{ n: existing }]: { n: number }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM fiesta_photos
        WHERE "dayId" = $1 AND "comunidadId" = $2 AND status <> 'rejected'`,
      [day.id, user.comunidad.id],
    );
    if (existing + files.length > MAX_PHOTOS_PER_DAY) {
      throw new BadRequestException(
        `Cada comunidad puede subir hasta ${MAX_PHOTOS_PER_DAY} fotos por día (ya tienen ${existing}).`,
      );
    }
    const results = await Promise.allSettled(
      files.map((f) =>
        uploadImageWithPublicId(f, `jmv_ecuador/fiestas/${fiesta.slug}`),
      ),
    );
    const uploaded = results.flatMap((r) =>
      r.status === 'fulfilled' ? [r.value] : [],
    );
    if (uploaded.length === 0) {
      const err = results.find((r) => r.status === 'rejected');
      this.logger.error(`Fotos de fiesta: ${String(err?.reason)}`);
      throw new ServiceUnavailableException(
        'No se pudieron subir las fotos. Inténtalo de nuevo en unos minutos.',
      );
    }
    const rows = uploaded.map((u) =>
      this.photos.create({
        day: { id: day.id },
        comunidad: { id: user.comunidad.id },
        user: { id: userId },
        url: u.url,
        publicId: u.publicId,
        caption: caption ?? null,
        // Salen directo al mural; un administrador puede quitarlas después
        status: 'approved',
      }),
    );
    await this.photos.save(rows);
    return { uploaded: rows.length, failed: files.length - rows.length };
  }

  /** Mi comunidad en la fiesta: cómo la viven, quiénes participan y sus fotos */
  async myCommunity(slug: string, userId: string) {
    const fiesta = await this.fiestaBySlug(slug);
    const user = await this.loadUser(userId);
    if (!user.comunidad) return { comunidad: null };
    const isLead = Boolean(user.isCommunityLead);
    const mode = await this.modes.findOne({
      where: { fiestaId: fiesta.id, comunidadId: user.comunidad.id },
    });
    const perDay: { dayNumber: number; participants: number }[] =
      await this.dataSource.query(
        `SELECT d."dayNumber", COUNT(e.id)::int AS participants
           FROM fiesta_days d
           LEFT JOIN fiesta_entries e ON e."dayId" = d.id
                AND e."userId" IN (SELECT id FROM "user" WHERE "comunidadId" = $2)
          WHERE d."fiestaId" = $1
          GROUP BY d."dayNumber" ORDER BY d."dayNumber"`,
        [fiesta.id, user.comunidad.id],
      );
    const photos: {
      id: string;
      url: string;
      caption: string | null;
      status: PhotoStatus;
      dayNumber: number;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.url, p.caption, p.status, d."dayNumber"
         FROM fiesta_photos p JOIN fiesta_days d ON d.id = p."dayId"
        WHERE d."fiestaId" = $1 AND p."comunidadId" = $2
          ${isLead ? '' : `AND p.status = 'approved'`}
        ORDER BY p."createdAt" DESC`,
      [fiesta.id, user.comunidad.id],
    );
    return {
      comunidad: { id: user.comunidad.id, nombre: user.comunidad.nombre },
      isLead,
      mode: mode?.mode ?? null,
      perDay,
      photos,
      maxPhotosPerDay: MAX_PHOTOS_PER_DAY,
      earlyPhotos: Boolean(fiesta.earlyPhotos),
    };
  }

  async setMode(slug: string, userId: string, mode: FiestaMode) {
    const user = await this.requireLead(userId);
    const fiesta = await this.fiestaBySlug(slug);
    await this.modes.save({
      fiestaId: fiesta.id,
      comunidadId: user.comunidad.id,
      mode,
    });
    return { mode };
  }

  /** Responsable: retira una foto suya que aún no se aprobó */
  async removeOwnPhoto(photoId: string, userId: string) {
    const user = await this.requireLead(userId);
    const photo = await this.photos.findOne({
      where: { id: photoId },
      relations: { comunidad: true },
    });
    if (!photo || photo.comunidad.id !== user.comunidad.id)
      throw new NotFoundException('La foto no existe.');
    await this.photos.delete(photo.id);
    await deleteImageByPublicId(photo.publicId).catch(() => undefined);
    return { deleted: true };
  }

  // ── Admin ─────────────────────────────────────────────────────────────

  async adminList() {
    const rows: (Fiesta & { dayCount: number; participants: number })[] =
      await this.dataSource.query(
        `SELECT f.*, (SELECT COUNT(*)::int FROM fiesta_days d WHERE d."fiestaId" = f.id) AS "dayCount",
                (SELECT COUNT(DISTINCT e."userId")::int FROM fiesta_entries e
                   JOIN fiesta_days d ON d.id = e."dayId" WHERE d."fiestaId" = f.id) AS participants,
                (SELECT COUNT(*)::int FROM fiesta_photos p
                   JOIN fiesta_days d ON d.id = p."dayId"
                  WHERE d."fiestaId" = f.id AND p.status = 'pending') AS "pendingPhotos"
           FROM fiestas f ORDER BY f."feastDate" DESC`,
      );
    return rows;
  }

  async adminGet(id: string) {
    const fiesta = await this.fiestas.findOne({ where: { id } });
    if (!fiesta) throw new NotFoundException('No encontramos esta fiesta.');
    const days = await this.days.find({
      where: { fiesta: { id } },
      order: { dayNumber: 'ASC' },
    });
    const stats: {
      dayId: string;
      answered: number;
      purposes: number;
      photos: number;
    }[] = await this.dataSource.query(
      `SELECT d.id AS "dayId",
              (SELECT COUNT(*)::int FROM fiesta_entries e WHERE e."dayId" = d.id AND e.answers IS NOT NULL) AS answered,
              (SELECT COUNT(*)::int FROM fiesta_entries e WHERE e."dayId" = d.id AND e."purposeDone") AS purposes,
              (SELECT COUNT(*)::int FROM fiesta_photos p WHERE p."dayId" = d.id AND p.status = 'approved') AS photos
         FROM fiesta_days d WHERE d."fiestaId" = $1`,
      [id],
    );
    const byDay = new Map(stats.map((s) => [s.dayId, s]));
    return {
      ...fiesta,
      today: todayEc(),
      days: days.map((d) => ({
        ...d,
        stats: byDay.get(d.id) ?? { answered: 0, purposes: 0, photos: 0 },
      })),
    };
  }

  async adminUpdate(id: string, dto: UpdateFiestaDto) {
    const fiesta = await this.fiestas.findOne({ where: { id } });
    if (!fiesta) throw new NotFoundException('No encontramos esta fiesta.');
    Object.assign(fiesta, dto);
    await this.fiestas.save(fiesta);
    return this.adminGet(id);
  }

  async adminUpdateDay(dayId: string, dto: UpdateDayDto) {
    const day = await this.days.findOne({ where: { id: dayId } });
    if (!day) throw new NotFoundException('Este día no existe.');
    const { questions, ...rest } = dto;
    Object.assign(day, rest);
    if (questions) {
      day.questions = questions.map((q) => {
        const options = q.options.map((o) => o.trim());
        if (options.some((o) => !o))
          throw new BadRequestException(
            'Hay una opción vacía en una pregunta.',
          );
        if (q.correctIndex >= options.length)
          throw new BadRequestException(
            `Marca la respuesta correcta de: "${q.prompt}"`,
          );
        return {
          id: q.id || randomUUID().slice(0, 8),
          prompt: q.prompt.trim(),
          options,
          correctIndex: q.correctIndex,
          explanation: q.explanation ?? null,
        };
      });
    }
    if (day.published && !day.title.trim())
      throw new BadRequestException(
        'Ponle un título al día antes de publicarlo.',
      );
    await this.days.save(day);
    return day;
  }

  async adminPhotos(id: string, status?: PhotoStatus) {
    const params: unknown[] = [id];
    let filter = '';
    if (status) {
      params.push(status);
      filter = 'AND p.status = $2';
    }
    return this.dataSource.query<unknown[]>(
      `SELECT p.id, p.url, p.caption, p.status, p."createdAt", d."dayNumber", d.label,
              c.nombre AS comunidad, u."fullName" AS "uploadedBy"
         FROM fiesta_photos p
         JOIN fiesta_days d ON d.id = p."dayId"
         JOIN comunidades c ON c.id = p."comunidadId"
         LEFT JOIN "user" u ON u.id = p."userId"
        WHERE d."fiestaId" = $1 ${filter}
        ORDER BY (p.status = 'pending') DESC, p."createdAt" DESC
        LIMIT 500`,
      params,
    );
  }

  async adminSetPhotoStatus(photoId: string, status: PhotoStatus) {
    const res = await this.photos.update(
      { id: photoId },
      { status, reviewedAt: new Date() },
    );
    if (!res.affected) throw new NotFoundException('La foto no existe.');
    return { id: photoId, status };
  }

  async adminDeletePhoto(photoId: string) {
    const photo = await this.photos.findOne({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('La foto no existe.');
    await this.photos.delete(photoId);
    await deleteImageByPublicId(photo.publicId).catch((e: unknown) =>
      this.logger.warn(`No se borró de Cloudinary: ${String(e)}`),
    );
    return { deleted: true };
  }

  async adminLeads(q: LeadsQueryDto) {
    const params: unknown[] = [];
    const where: string[] = [`u."isActive" = true`];
    if (q.search?.trim()) {
      params.push(`%${q.search.trim()}%`);
      where.push(
        `(u."fullName" ILIKE $${params.length} OR u.email ILIKE $${params.length})`,
      );
    }
    if (q.comunidadId) {
      params.push(q.comunidadId);
      where.push(`u."comunidadId" = $${params.length}`);
    }
    if (q.onlyLeads) where.push(`u."isCommunityLead" = true`);
    return this.dataSource.query<unknown[]>(
      `SELECT u.id, u."fullName", u.email, u."isCommunityLead",
              c.id AS "comunidadId", c.nombre AS comunidad
         FROM "user" u LEFT JOIN comunidades c ON c.id = u."comunidadId"
        WHERE ${where.join(' AND ')}
        ORDER BY u."isCommunityLead" DESC, c.nombre NULLS LAST, u."fullName"
        LIMIT 60`,
      params,
    );
  }

  async adminSetLead(userId: string, lead: boolean) {
    const user = await this.loadUser(userId);
    if (lead && !user.comunidad)
      throw new BadRequestException(
        'Esta persona no tiene comunidad. Asígnale una antes de hacerla responsable.',
      );
    await this.users.update({ id: userId }, { isCommunityLead: lead });
    return { id: userId, isCommunityLead: lead };
  }
}
