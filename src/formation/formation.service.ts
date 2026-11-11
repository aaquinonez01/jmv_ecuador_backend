import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { removeStoredFile } from 'src/library/storage/library-storage';
import {
  FormationTopic,
  NationalTraining,
  PRAYER_CATEGORIES,
  Prayer,
  TrainingMaterial,
} from './entities/formation.entities';
import { UpsertPrayerDto, UpsertTopicDto, UpsertTrainingDto } from './dto/formation.dto';

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

@Injectable()
export class FormationService {
  constructor(
    @InjectRepository(FormationTopic) private readonly topics: Repository<FormationTopic>,
    @InjectRepository(NationalTraining) private readonly trainings: Repository<NationalTraining>,
    @InjectRepository(Prayer) private readonly prayers: Repository<Prayer>,
  ) {}

  // ── Itinerarios ────────────────────────────────────────────────────────

  findTopics(admin = false) {
    return this.topics.find({
      where: admin ? {} : { published: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findTopic(id: string, admin = false) {
    const item = await this.topics.findOne({ where: admin ? { id } : { id, published: true } });
    if (!item) throw new NotFoundException('Itinerario no encontrado');
    return item;
  }

  createTopic(dto: UpsertTopicDto) {
    return this.topics.save(this.topics.create(this.topicData(dto)));
  }

  async updateTopic(id: string, dto: UpsertTopicDto) {
    const item = await this.findTopic(id, true);
    Object.assign(item, this.topicData(dto));
    return this.topics.save(item);
  }

  async removeTopic(id: string) {
    await this.topics.remove(await this.findTopic(id, true));
    return { id };
  }

  private topicData(dto: UpsertTopicDto): Partial<FormationTopic> {
    return {
      title: dto.title.trim(),
      summary: clean(dto.summary),
      axis: dto.axis,
      levels: [...new Set(dto.levels)],
      subtopics: dto.subtopics.map((s) => s.trim()).filter(Boolean),
      references: dto.references
        .filter((r) => r.title.trim())
        .map((r) => ({
          type: r.type,
          title: r.title.trim(),
          detail: clean(r.detail) ?? undefined,
          url: clean(r.url) ?? undefined,
        })),
      displayOrder: dto.displayOrder ?? 0,
      published: dto.published ?? false,
    };
  }

  // ── Formaciones nacionales ─────────────────────────────────────────────

  findTrainings(admin = false) {
    return this.trainings.find({
      where: admin ? {} : { published: true },
      order: { startsAt: 'DESC' },
    });
  }

  async findTraining(id: string, admin = false) {
    const item = await this.trainings.findOne({ where: admin ? { id } : { id, published: true } });
    if (!item) throw new NotFoundException('Formación no encontrada');
    return item;
  }

  createTraining(dto: UpsertTrainingDto) {
    return this.trainings.save(this.trainings.create(this.trainingData(dto)));
  }

  async updateTraining(id: string, dto: UpsertTrainingDto) {
    const item = await this.findTraining(id, true);
    const before = this.fileNames(item.materials);
    Object.assign(item, this.trainingData(dto));
    const saved = await this.trainings.save(item);
    // PDFs que se quitaron del material: se borran del disco
    const after = new Set(this.fileNames(saved.materials));
    await Promise.all(before.filter((f) => !after.has(f)).map((f) => removeStoredFile(f).catch(() => undefined)));
    return saved;
  }

  async removeTraining(id: string) {
    const item = await this.findTraining(id, true);
    await this.trainings.remove(item);
    await Promise.all(this.fileNames(item.materials).map((f) => removeStoredFile(f).catch(() => undefined)));
    return { id };
  }

  private fileNames(materials: TrainingMaterial[]) {
    return materials.map((m) => m.fileName).filter((f): f is string => Boolean(f));
  }

  private trainingData(dto: UpsertTrainingDto): Partial<NationalTraining> {
    const materials = dto.materials.map((m, i) => {
      const url = clean(m.url) ?? undefined;
      if (!url && !m.fileName) throw new BadRequestException(`Material ${i + 1}: sube un PDF o pega un enlace`);
      return { title: m.title.trim(), type: m.type, url: m.fileName ? undefined : url, fileName: m.fileName };
    });
    return {
      title: dto.title.trim(),
      speaker: clean(dto.speaker),
      startsAt: new Date(dto.startsAt),
      description: clean(dto.description),
      meetingUrl: clean(dto.meetingUrl),
      recordingUrl: clean(dto.recordingUrl),
      materials,
      published: dto.published ?? false,
    };
  }

  // ── Oraciones ──────────────────────────────────────────────────────────

  async findPrayers(admin = false) {
    const items = await this.prayers.find({
      where: admin ? {} : { published: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
    // Agrupadas en el orden de las categorías
    const order = (c: string) => PRAYER_CATEGORIES.indexOf(c as (typeof PRAYER_CATEGORIES)[number]);
    return items.sort((a, b) => order(a.category) - order(b.category) || a.displayOrder - b.displayOrder);
  }

  async findPrayer(id: string) {
    const item = await this.prayers.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Oración no encontrada');
    return item;
  }

  createPrayer(dto: UpsertPrayerDto) {
    return this.prayers.save(this.prayers.create(this.prayerData(dto)));
  }

  async updatePrayer(id: string, dto: UpsertPrayerDto) {
    const item = await this.findPrayer(id);
    Object.assign(item, this.prayerData(dto));
    return this.prayers.save(item);
  }

  async removePrayer(id: string) {
    await this.prayers.remove(await this.findPrayer(id));
    return { id };
  }

  private prayerData(dto: UpsertPrayerDto): Partial<Prayer> {
    return {
      title: dto.title.trim(),
      category: dto.category,
      text: dto.text.trim(),
      source: clean(dto.source),
      displayOrder: dto.displayOrder ?? 0,
      published: dto.published ?? true,
    };
  }
}
