import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index('idx_site_image_section', ['section', 'subsection', 'orden'])
@Entity()
export class SiteImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  section: string;

  @Column({ type: 'text', nullable: true })
  subsection?: string | null;

  @Column({ type: 'text' })
  url: string;

  // public_id de Cloudinary, para borrar el archivo al eliminar la foto.
  // Las fotos antiguas no lo tienen: se deduce de la URL.
  @Column({ type: 'text', nullable: true })
  publicId?: string | null;

  @Column({ type: 'text' })
  filename: string;

  @Column({ type: 'text' })
  alt: string;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'int', default: 1 })
  orden: number;

  @Column({ type: 'bool', default: true })
  activo: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    size?: number;
    width?: number;
    height?: number;
    format?: string;
    uploadedAt?: string;
    uploadedBy?: string;
    groupId?: string;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  eventData?: {
    date?: string;
    location?: string;
    status?: string;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  personData?: {
    name?: string;
    role?: string;
    zone?: string;
  } | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
