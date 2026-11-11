import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FORMATION_STEPS,
  FormationEncounter,
} from './entities/formation-encounter.entity';
import { FormationProgress } from './entities/formation-progress.entity';
import { CompleteEncounterDto, UpsertEncounterDto } from './dto/formation.dto';

const stepIndex = (s: string) => FORMATION_STEPS.indexOf(s as (typeof FORMATION_STEPS)[number]);

function byPath(a: FormationEncounter, b: FormationEncounter) {
  return stepIndex(a.step) - stepIndex(b.step) || a.displayOrder - b.displayOrder;
}

@Injectable()
export class FormationService {
  constructor(
    @InjectRepository(FormationEncounter)
    private readonly encounters: Repository<FormationEncounter>,
    @InjectRepository(FormationProgress)
    private readonly progress: Repository<FormationProgress>,
  ) {}

  // ── Joven ──────────────────────────────────────────────────────────────

  /** Encuentros publicados en el orden del camino, con lo que el joven ya vivió */
  async findMyPath(userId: string) {
    const [items, done] = await Promise.all([
      this.encounters.find({ where: { published: true } }),
      this.progress.find({ where: { userId } }),
    ]);
    const doneById = new Map(done.map((p) => [p.encounterId, p]));
    return {
      steps: FORMATION_STEPS,
      items: items.sort(byPath).map((e) => ({
        ...e,
        completed: doneById.has(e.id),
        completedAt: doneById.get(e.id)?.completedAt ?? null,
        quizScore: doneById.get(e.id)?.quizScore ?? null,
      })),
    };
  }

  async findPublished(id: string) {
    const item = await this.encounters.findOne({ where: { id, published: true } });
    if (!item) throw new NotFoundException('Encuentro no encontrado');
    return item;
  }

  async complete(userId: string, encounterId: string, dto: CompleteEncounterDto) {
    const encounter = await this.findPublished(encounterId);
    if (dto.quizScore != null && dto.quizScore > encounter.quiz.length) {
      throw new BadRequestException('Puntaje fuera de rango');
    }
    const existing = await this.progress.findOne({ where: { userId, encounterId } });
    if (existing) {
      // Repetir el encuentro conserva el mejor puntaje
      if (dto.quizScore != null && (existing.quizScore ?? -1) < dto.quizScore) {
        existing.quizScore = dto.quizScore;
        await this.progress.save(existing);
      }
      return existing;
    }
    return this.progress.save(
      this.progress.create({ userId, encounterId, quizScore: dto.quizScore ?? null }),
    );
  }

  // ── Administración ─────────────────────────────────────────────────────

  async findAllAdmin() {
    const items = await this.encounters.find();
    const counts = await this.progress
      .createQueryBuilder('p')
      .select('p.encounterId', 'encounterId')
      .addSelect('COUNT(*)', 'total')
      .groupBy('p.encounterId')
      .getRawMany<{ encounterId: string; total: string }>();
    const byId = new Map(counts.map((c) => [c.encounterId, Number(c.total)]));
    return items.sort(byPath).map((e) => ({ ...e, completions: byId.get(e.id) ?? 0 }));
  }

  async findOneAdmin(id: string) {
    const item = await this.encounters.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Encuentro no encontrado');
    return item;
  }

  create(dto: UpsertEncounterDto) {
    this.checkQuiz(dto);
    return this.encounters.save(this.encounters.create(this.normalize(dto)));
  }

  async update(id: string, dto: UpsertEncounterDto) {
    this.checkQuiz(dto);
    const item = await this.findOneAdmin(id);
    Object.assign(item, this.normalize(dto));
    return this.encounters.save(item);
  }

  async remove(id: string) {
    const item = await this.findOneAdmin(id);
    await this.encounters.remove(item);
    return { id };
  }

  private checkQuiz(dto: UpsertEncounterDto) {
    dto.quiz.forEach((q, i) => {
      if (q.options.length < 2) throw new BadRequestException(`Pregunta ${i + 1}: necesita al menos 2 opciones`);
      if (q.correct >= q.options.length) throw new BadRequestException(`Pregunta ${i + 1}: la respuesta correcta no existe`);
    });
  }

  private normalize(dto: UpsertEncounterDto): Partial<FormationEncounter> {
    const clean = (s?: string | null) => (s?.trim() ? s.trim() : undefined);
    return {
      title: dto.title.trim(),
      summary: clean(dto.summary) ?? null,
      step: dto.step,
      pillar: dto.pillar ?? null,
      displayOrder: dto.displayOrder ?? 0,
      durationMinutes: dto.durationMinutes ?? 15,
      coverImageUrl: clean(dto.coverImageUrl) ?? null,
      contemplar: {
        passageRef: clean(dto.contemplar.passageRef),
        passageText: clean(dto.contemplar.passageText),
        prayer: clean(dto.contemplar.prayer),
      },
      vivir: {
        cards: dto.vivir.cards.filter((c) => c.body.trim()).map((c) => ({ title: clean(c.title), body: c.body.trim() })),
        videoUrl: clean(dto.vivir.videoUrl),
        documentSlug: clean(dto.vivir.documentSlug),
      },
      servir: { commitment: dto.servir.commitment.trim() },
      reflectionQuestions: dto.reflectionQuestions.map((q) => q.trim()).filter(Boolean),
      quiz: dto.quiz.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correct: q.correct,
        explanation: clean(q.explanation),
      })),
      source: clean(dto.source) ?? null,
      published: dto.published ?? false,
    };
  }
}
