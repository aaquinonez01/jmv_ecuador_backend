import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AdminUpsertQuestionDto,
  ListQuestionsDto,
  UpsertQuestionDto,
} from './dto/game.dto';

const PAGE_SIZE = 30;

export interface QuestionRow {
  id: string;
  category: string;
  levels: string[];
  difficulty: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  source: string | null;
  status: string;
  proposedById: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

// Banco de preguntas de Gira y Aprende
@Injectable()
export class GameQuestionsService {
  constructor(private readonly dataSource: DataSource) {}

  private validate(dto: UpsertQuestionDto) {
    const options = dto.options.map((o) => o.trim());
    if (options.some((o) => !o))
      throw new BadRequestException('Ninguna opción puede quedar vacía');
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
      throw new BadRequestException('Hay opciones repetidas');
    if (dto.correctIndex >= options.length)
      throw new BadRequestException('Marca cuál es la respuesta correcta');
    return {
      category: dto.category,
      levels: JSON.stringify([...new Set(dto.levels)]),
      difficulty: dto.difficulty,
      prompt: dto.prompt.trim(),
      options: JSON.stringify(options),
      correctIndex: dto.correctIndex,
      explanation: clean(dto.explanation),
      source: clean(dto.source),
    };
  }

  // ── App ──

  /**
   * Paquete para jugar sin conexión: preguntas aprobadas cambiadas desde `since`
   * (con su respuesta) y las que se quitaron. La app guarda el paquete en el teléfono.
   */
  async pack(since?: string) {
    const params: unknown[] = [];
    let where = `status = 'approved' AND deleted = false`;
    let removedWhere = `(status <> 'approved' OR deleted = true)`;
    if (since) {
      params.push(since);
      where += ` AND "updatedAt" > $1`;
      removedWhere += ` AND "updatedAt" > $1`;
    }
    const questions: Omit<
      QuestionRow,
      'status' | 'proposedById' | 'deleted' | 'createdAt'
    >[] = await this.dataSource.query(
      `SELECT id, category, levels, difficulty, prompt, options, "correctIndex", explanation, source, "updatedAt"
         FROM game_questions WHERE ${where} ORDER BY "updatedAt"`,
      params,
    );
    const removed: { id: string }[] = since
      ? await this.dataSource.query(
          `SELECT id FROM game_questions WHERE ${removedWhere}`,
          params,
        )
      : [];
    const [{ now }]: { now: Date }[] =
      await this.dataSource.query(`SELECT now() AS now`);
    return {
      questions,
      removed: removed.map((r) => r.id),
      serverTime: now,
      full: !since,
    };
  }

  /** Un miembro verificado propone una pregunta; el equipo de formación la revisa */
  async propose(userId: string, dto: UpsertQuestionDto) {
    const [u]: { memberStatus: string }[] = await this.dataSource.query(
      `SELECT "memberStatus" FROM "user" WHERE id = $1`,
      [userId],
    );
    if (u?.memberStatus !== 'verified')
      throw new ForbiddenException(
        'Solo los miembros verificados pueden proponer preguntas.',
      );
    const [{ n }]: { n: number }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM game_questions WHERE "proposedById" = $1 AND status = 'pending'`,
      [userId],
    );
    if (n >= 20)
      throw new BadRequestException(
        'Tienes 20 preguntas esperando revisión. Espera a que las revisen.',
      );
    const d = this.validate(dto);
    await this.dataSource.query(
      `INSERT INTO game_questions (category, levels, difficulty, prompt, options, "correctIndex", explanation, source, status, "proposedById")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)`,
      [
        d.category,
        d.levels,
        d.difficulty,
        d.prompt,
        d.options,
        d.correctIndex,
        d.explanation,
        d.source,
        userId,
      ],
    );
    return { ok: true };
  }

  // ── Admin ──

  async list(q: ListQuestionsDto) {
    const page = q.page ?? 1;
    const params: unknown[] = [];
    const where = ['q.deleted = false'];
    if (q.category) where.push(`q.category = $${params.push(q.category)}`);
    if (q.status) where.push(`q.status = $${params.push(q.status)}`);
    if (q.search?.trim())
      where.push(
        `(q.prompt ILIKE $${params.push(`%${q.search.trim()}%`)} OR q.options::text ILIKE $${params.length})`,
      );
    const w = where.join(' AND ');
    const items: (QuestionRow & { proposedBy: string | null })[] =
      await this.dataSource.query(
        `SELECT q.*, COALESCE(NULLIF(u."displayName", ''), u."fullName") AS "proposedBy"
       FROM game_questions q LEFT JOIN "user" u ON u.id = q."proposedById"
       WHERE ${w} ORDER BY (q.status = 'pending') DESC, q."updatedAt" DESC
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
        params,
      );
    const [{ total }]: { total: number }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM game_questions q WHERE ${w}`,
      params,
    );
    const counts: { category: string; status: string; n: number }[] =
      await this.dataSource.query(
        `SELECT category, status, COUNT(*)::int AS n FROM game_questions WHERE deleted = false GROUP BY category, status`,
      );
    return { items, total, page, pageSize: PAGE_SIZE, counts };
  }

  async create(dto: AdminUpsertQuestionDto) {
    const d = this.validate(dto);
    const [row]: QuestionRow[] = await this.dataSource.query(
      `INSERT INTO game_questions (category, levels, difficulty, prompt, options, "correctIndex", explanation, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        d.category,
        d.levels,
        d.difficulty,
        d.prompt,
        d.options,
        d.correctIndex,
        d.explanation,
        d.source,
        dto.status ?? 'approved',
      ],
    );
    return row;
  }

  async update(id: string, dto: AdminUpsertQuestionDto) {
    const d = this.validate(dto);
    const res: unknown = await this.dataSource.query(
      `UPDATE game_questions SET category = $2, levels = $3, difficulty = $4, prompt = $5, options = $6,
         "correctIndex" = $7, explanation = $8, source = $9, status = COALESCE($10, status), "updatedAt" = now()
       WHERE id = $1 AND deleted = false RETURNING *`,
      [
        id,
        d.category,
        d.levels,
        d.difficulty,
        d.prompt,
        d.options,
        d.correctIndex,
        d.explanation,
        d.source,
        dto.status ?? null,
      ],
    );
    const rows = (
      Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res
    ) as QuestionRow[];
    if (!rows.length) throw new NotFoundException('Pregunta no encontrada');
    return rows[0];
  }

  async setStatus(id: string, status: string) {
    const res: unknown = await this.dataSource.query(
      `UPDATE game_questions SET status = $2, "updatedAt" = now() WHERE id = $1 AND deleted = false RETURNING id`,
      [id, status],
    );
    const rows = (
      Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res
    ) as unknown[];
    if (!rows.length) throw new NotFoundException('Pregunta no encontrada');
    return { id, status };
  }

  /** Se marca como borrada (no se elimina) para que los teléfonos la quiten de su paquete */
  async remove(id: string) {
    await this.dataSource.query(
      `UPDATE game_questions SET deleted = true, "updatedAt" = now() WHERE id = $1`,
      [id],
    );
  }
}
