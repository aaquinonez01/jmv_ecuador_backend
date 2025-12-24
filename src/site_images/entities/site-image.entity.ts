import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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
