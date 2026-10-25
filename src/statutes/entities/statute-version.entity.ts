import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Versión de los Estatutos Nacionales. Se guardan todas para conservar el
// historial; solo una puede estar vigente a la vez (índice parcial único).
@Index('uq_statute_versions_current', ['isCurrent'], {
  unique: true,
  where: '"isCurrent" = true',
})
@Index('idx_statute_versions_published_approved', ['published', 'approvedAt'])
@Entity('statute_versions')
export class StatuteVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  // Etiqueta corta de la versión, p. ej. "2010"
  @Column({ type: 'varchar', length: 40 })
  versionLabel!: string;

  // Fecha solo día (AAAA-MM-DD)
  @Column({ type: 'date' })
  approvedAt!: string;

  @Column({ type: 'varchar', length: 200 })
  approvedBy!: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  // Markdown con las convenciones de los estatutos (### Artículo N · Título)
  @Column({ type: 'text' })
  content!: string;

  // URL https o ruta /documentos/... del PDF original
  @Column({ type: 'text', nullable: true })
  pdfUrl?: string | null;

  @Column({ type: 'bool', default: false })
  isCurrent!: boolean;

  @Column({ type: 'bool', default: true })
  published!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
