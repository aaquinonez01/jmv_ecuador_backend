import { PushService } from 'src/push/push.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { removeStoredFile } from 'src/library/storage/library-storage';
import {
  FormationTopic,
  NationalTraining,
  PRAYER_CATEGORIES,
  Prayer,
  Song,
  Teaching,
  TrainingMaterial,
} from './entities/formation.entities';
import {
  UpsertPrayerDto,
  UpsertSongDto,
  UpsertTeachingDto,
  UpsertTopicDto,
  UpsertTrainingDto,
} from './dto/formation.dto';

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

/** Evangelio del día tal como lo entrega la app */
export interface DailyGospel {
  date: string;
  /** Ej.: "Lunes de la 33a semana del Tiempo Ordinario" */
  liturgy: string;
  /** Ej.: "Evangelio según San Lucas 18,35-43." */
  title: string;
  /** Ej.: "Lc 18,35-43." */
  reference: string;
  text: string;
  /** Traducción bíblica de la que sale el texto */
  bible: string;
  credit: string;
}

const GOSPEL_FEED = 'https://feed.evangelizo.org/v2/reader.php';
const DAY_MS = 86_400_000;
/** Hoy en Ecuador (UTC-5), AAAA-MM-DD */
const todayEc = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

/** El feed entrega HTML sencillo: se pasa a texto plano sin tocar las palabras */
const plain = (html: string) =>
  html
    .replace(/<br\s*\/?>(\r?\n)?/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

@Injectable()
export class FormationService {
  private readonly logger = new Logger(FormationService.name);
  /** Evangelios ya consultados (uno por fecha), para no pedirlos en cada visita */
  private readonly gospels = new Map<string, DailyGospel>();

  constructor(
    @InjectRepository(FormationTopic)
    private readonly topics: Repository<FormationTopic>,
    @InjectRepository(NationalTraining)
    private readonly trainings: Repository<NationalTraining>,
    @InjectRepository(Prayer) private readonly prayers: Repository<Prayer>,
    @InjectRepository(Song) private readonly songs: Repository<Song>,
    @InjectRepository(Teaching)
    private readonly teachings: Repository<Teaching>,
    private readonly push: PushService,
  ) {}

  // ── Itinerarios ────────────────────────────────────────────────────────

  findTopics(admin = false) {
    return this.topics.find({
      where: admin ? {} : { published: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findTopic(id: string, admin = false) {
    const item = await this.topics.findOne({
      where: admin ? { id } : { id, published: true },
    });
    if (!item) throw new NotFoundException('Itinerario no encontrado');
    return item;
  }

  async createTopic(dto: UpsertTopicDto) {
    const saved = await this.topics.save(
      this.topics.create(this.topicData(dto)),
    );
    if (saved.published) this.announceTopic(saved);
    return saved;
  }

  async updateTopic(id: string, dto: UpsertTopicDto) {
    const item = await this.findTopic(id, true);
    const wasPublished = item.published;
    Object.assign(item, this.topicData(dto));
    const saved = await this.topics.save(item);
    if (!wasPublished && saved.published) this.announceTopic(saved);
    return saved;
  }

  private announceTopic(topic: FormationTopic) {
    this.push.notifyAll({
      title: '🧭 Nuevo itinerario de formación',
      body: topic.title,
      data: { screen: `/itinerario/${topic.id}` },
    });
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
    const item = await this.trainings.findOne({
      where: admin ? { id } : { id, published: true },
    });
    if (!item) throw new NotFoundException('Formación no encontrada');
    return item;
  }

  async createTraining(dto: UpsertTrainingDto) {
    const saved = await this.trainings.save(
      this.trainings.create(this.trainingData(dto)),
    );
    if (saved.published) this.announceTraining(saved);
    return saved;
  }

  private announceTraining(training: NationalTraining) {
    this.push.notifyAll({
      title: '🎓 Nueva formación nacional',
      body: training.title,
      data: { screen: `/formacion-nacional/${training.id}` },
    });
  }

  async updateTraining(id: string, dto: UpsertTrainingDto) {
    const item = await this.findTraining(id, true);
    const wasPublished = item.published;
    const before = this.fileNames(item.materials);
    Object.assign(item, this.trainingData(dto));
    const saved = await this.trainings.save(item);
    // PDFs que se quitaron del material: se borran del disco
    const after = new Set(this.fileNames(saved.materials));
    await Promise.all(
      before
        .filter((f) => !after.has(f))
        .map((f) => removeStoredFile(f).catch(() => undefined)),
    );
    if (!wasPublished && saved.published) this.announceTraining(saved);
    return saved;
  }

  async removeTraining(id: string) {
    const item = await this.findTraining(id, true);
    await this.trainings.remove(item);
    await Promise.all(
      this.fileNames(item.materials).map((f) =>
        removeStoredFile(f).catch(() => undefined),
      ),
    );
    return { id };
  }

  private fileNames(materials: TrainingMaterial[]) {
    return materials
      .map((m) => m.fileName)
      .filter((f): f is string => Boolean(f));
  }

  private trainingData(dto: UpsertTrainingDto): Partial<NationalTraining> {
    const materials = dto.materials.map((m, i) => {
      const url = clean(m.url) ?? undefined;
      if (!url && !m.fileName)
        throw new BadRequestException(
          `Material ${i + 1}: sube un PDF o pega un enlace`,
        );
      return {
        title: m.title.trim(),
        type: m.type,
        url: m.fileName ? undefined : url,
        fileName: m.fileName,
      };
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
    const order = (c: string) =>
      PRAYER_CATEGORIES.indexOf(c as (typeof PRAYER_CATEGORIES)[number]);
    return items.sort(
      (a, b) =>
        order(a.category) - order(b.category) ||
        a.displayOrder - b.displayOrder,
    );
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

  // ── Cantos ─────────────────────────────────────────────────────────────

  findSongs(admin = false) {
    return this.songs.find({
      where: admin ? {} : { published: true },
      order: { title: 'ASC' },
    });
  }

  async findSong(id: string) {
    const item = await this.songs.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Canto no encontrado');
    return item;
  }

  createSong(dto: UpsertSongDto) {
    return this.songs.save(this.songs.create(this.songData(dto)));
  }

  async updateSong(id: string, dto: UpsertSongDto) {
    const item = await this.findSong(id);
    Object.assign(item, this.songData(dto));
    return this.songs.save(item);
  }

  async removeSong(id: string) {
    await this.songs.remove(await this.findSong(id));
    return { id };
  }

  private songData(dto: UpsertSongDto): Partial<Song> {
    return {
      title: dto.title.trim(),
      author: clean(dto.author),
      category: dto.category,
      // Se conservan los espacios de cada línea: alinean los acordes
      lyrics: dto.lyrics.replace(/\r\n/g, '\n').replace(/\s+$/, ''),
      songKey: clean(dto.songKey),
      videoUrl: clean(dto.videoUrl),
      displayOrder: dto.displayOrder ?? 0,
      published: dto.published ?? true,
    };
  }

  // ── Enseñanzas ("¿Qué quieres aprender hoy?") ──────────────────────────

  findTeachings(admin = false) {
    return this.teachings.find({
      where: admin ? {} : { published: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findTeaching(id: string) {
    const item = await this.teachings.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Enseñanza no encontrada');
    return item;
  }

  createTeaching(dto: UpsertTeachingDto) {
    return this.teachings.save(this.teachings.create(this.teachingData(dto)));
  }

  async updateTeaching(id: string, dto: UpsertTeachingDto) {
    const item = await this.findTeaching(id);
    Object.assign(item, this.teachingData(dto));
    return this.teachings.save(item);
  }

  async removeTeaching(id: string) {
    await this.teachings.remove(await this.findTeaching(id));
    return { id };
  }

  private teachingData(dto: UpsertTeachingDto): Partial<Teaching> {
    const steps = (list?: { title: string; text: string }[]) =>
      (list ?? [])
        .map((s) => ({ title: s.title.trim(), text: s.text.trim() }))
        .filter((s) => s.title);
    return {
      title: dto.title.trim(),
      summary: dto.summary.trim(),
      needs: (dto.needs ?? []).map((n) => n.trim()).filter(Boolean),
      steps: steps(dto.steps),
      groupSteps: steps(dto.groupSteps),
      source: clean(dto.source),
      guide: dto.guide ?? 'pasos',
      icon: clean(dto.icon),
      displayOrder: dto.displayOrder ?? 0,
      published: dto.published ?? true,
    };
  }

  // ── Evangelio del día ──────────────────────────────────────────────────

  /**
   * Evangelio de la misa del día, tomado de Evangelizo (evangeliodeldia.org).
   * Solo se atienden fechas cercanas a hoy, que son las que el feed publica.
   */
  async dailyGospel(date?: string): Promise<DailyGospel> {
    const today = todayEc();
    const day = date ?? today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)))
      throw new BadRequestException('Fecha no válida');
    if (Math.abs(Date.parse(day) - Date.parse(today)) > 14 * DAY_MS)
      throw new BadRequestException('Solo hay evangelio para fechas cercanas a hoy');

    const cached = this.gospels.get(day);
    if (cached) return cached;

    const ask = async (params: string) => {
      const res = await fetch(
        `${GOSPEL_FEED}?date=${day.replace(/-/g, '')}&lang=SP&${params}`,
        { signal: AbortSignal.timeout(12_000) },
      );
      if (!res.ok) throw new Error(`Evangelizo ${res.status}`);
      return plain(await res.text());
    };

    try {
      const [liturgy, title, reference, body] = await Promise.all([
        ask('type=liturgic_t'),
        ask('type=reading_lt&content=GSP'),
        ask('type=reading_st&content=GSP'),
        ask('type=reading&content=GSP'),
      ]);
      // Al final del texto el feed añade de qué Biblia sale y una invitación a suscribirse
      const cut = body.search(/\n\s*Extraído de la Biblia/i);
      const text = (cut >= 0 ? body.slice(0, cut) : body).trim();
      const bible =
        /Extraído de la Biblia:\s*([^\n]+?)\.?\s*(\n|$)/i.exec(body)?.[1]?.trim() ?? '';
      if (text.length < 20) throw new Error('Evangelizo devolvió un texto vacío');

      const gospel: DailyGospel = {
        date: day,
        liturgy,
        title,
        reference,
        text,
        bible,
        credit: 'evangeliodeldia.org',
      };
      if (this.gospels.size > 60) this.gospels.clear();
      this.gospels.set(day, gospel);
      return gospel;
    } catch (e) {
      this.logger.warn(`No se pudo traer el evangelio de ${day}: ${(e as Error).message}`);
      throw new ServiceUnavailableException('El evangelio de hoy no está disponible en este momento');
    }
  }
}
