import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoAsesor {
  ASESOR = 'asesor',
  ASESORA = 'asesora',
}

@Entity('asesores')
export class Asesor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: TipoAsesor })
  tipo!: TipoAsesor;

  @Column({ type: 'varchar', length: 180 })
  nombre!: string;

  @Column({ type: 'varchar', length: 160 })
  cargo!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  comunidad?: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  santoFavorito?: string;

  @Column({ type: 'text', nullable: true })
  citaBiblica?: string;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono?: string;

  @Column({ type: 'date' })
  fechaInicio!: string;

  @Column({ type: 'date' })
  fechaFin!: string;

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
