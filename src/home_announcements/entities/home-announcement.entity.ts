import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoAnnouncement {
  NUEVO_CONSEJO = 'nuevo_consejo',
  NUEVO_ASESOR = 'nuevo_asesor',
  NUEVA_VOCALIA = 'nueva_vocalia',
  GENERAL = 'general',
}

@Entity('home_announcements')
export class HomeAnnouncement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  titulo!: string;

  @Column({ type: 'varchar', length: 220, nullable: true })
  subtitulo?: string;

  @Column({ type: 'text' })
  mensaje!: string;

  @Column({
    type: 'enum',
    enum: TipoAnnouncement,
    default: TipoAnnouncement.GENERAL,
  })
  tipo!: TipoAnnouncement;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  ctaLabel?: string;

  @Column({ type: 'varchar', length: 220, nullable: true })
  ctaUrl?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaPublicacion!: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaExpiracion?: Date;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'bool', default: true })
  featuredInHome!: boolean;

  @Column({ type: 'bool', default: true })
  active!: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
