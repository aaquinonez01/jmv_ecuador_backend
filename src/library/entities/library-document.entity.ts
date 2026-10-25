import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LibraryCollectionItem } from './library-collection-item.entity';

export const LIBRARY_KINDS = ['pdf', 'enlace', 'video'] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

export const LIBRARY_TYPES = [
  'libro',
  'documento',
  'guia',
  'oracion',
  'otro',
] as const;
export type LibraryType = (typeof LIBRARY_TYPES)[number];

// Los 5 ejes de formación de /formacion/ejes
export const LIBRARY_AXES = [
  'humano',
  'cristocentrico',
  'mariano',
  'vicenciano',
  'eclesial',
] as const;
export type LibraryAxis = (typeof LIBRARY_AXES)[number];

export const LIBRARY_STAGES = [
  'aspirante',
  'promesa',
  'consagrado',
  'animador',
  'todos',
] as const;
export type LibraryStage = (typeof LIBRARY_STAGES)[number];

export const LIBRARY_VISIBILITIES = ['publico', 'miembros'] as const;
export type LibraryVisibility = (typeof LIBRARY_VISIBILITIES)[number];

@Index('idx_library_documents_published_order', [
  'published',
  'featured',
  'displayOrder',
])
@Entity('library_documents')
export class LibraryDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 140, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  author?: string | null;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 10 })
  kind!: LibraryKind;

  @Column({ type: 'varchar', length: 20 })
  type!: LibraryType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  axis?: LibraryAxis | null;

  @Column({ type: 'varchar', length: 20, default: 'todos' })
  stage!: LibraryStage;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'varchar', length: 10, default: 'publico' })
  visibility!: LibraryVisibility;

  @Column({ type: 'text', nullable: true })
  coverUrl?: string | null;

  // Solo para portadas subidas a Cloudinary (permite borrarlas)
  @Column({ type: 'text', nullable: true })
  coverPublicId?: string | null;

  @Column({ type: 'text', nullable: true })
  externalUrl?: string | null;

  // Nombre del archivo dentro de LIBRARY_STORAGE_DIR (uuid.pdf); nunca se expone
  @Column({ type: 'varchar', length: 64, nullable: true })
  filePath?: string | null;

  // Nombre original con el que se subió (solo informativo para el admin)
  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName?: string | null;

  @Column({ type: 'int', nullable: true })
  fileSize?: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fileMime?: string | null;

  @Column({ type: 'int', nullable: true })
  pageCount?: number | null;

  @Column({ type: 'int', nullable: true })
  readingMinutes?: number | null;

  @Column({ type: 'bool', default: false })
  featured!: boolean;

  @Column({ type: 'bool', default: true })
  published!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'int', default: 0 })
  views!: number;

  @Column({ type: 'int', default: 0 })
  downloads!: number;

  @OneToMany(() => LibraryCollectionItem, (item) => item.document)
  collectionItems?: LibraryCollectionItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
