import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConsejoPeriod } from './consejo-period.entity';

export enum TipoCargoConsejo {
  COORDINADOR = 'coordinador',
  VICECOORDINADOR = 'vicecoordinador',
  SECRETARIO = 'secretario',
  TESORERO = 'tesorero',
  VOCAL = 'vocal',
}

@Entity('consejo_members')
export class ConsejoMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ConsejoPeriod, (period) => period.miembros, {
    onDelete: 'CASCADE',
  })
  period!: ConsejoPeriod;

  @Column({ type: 'varchar', length: 160 })
  nombre!: string;

  @Column({ type: 'varchar', length: 160 })
  cargo!: string;

  @Column({
    type: 'enum',
    enum: TipoCargoConsejo,
    default: TipoCargoConsejo.VOCAL,
  })
  tipoCargo!: TipoCargoConsejo;

  @Column({ type: 'int', nullable: true })
  edad?: number;

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

  @Column({ type: 'date', nullable: true })
  fechaPosesion?: string;

  @Column({ type: 'date', nullable: true })
  fechaFinCargo?: string;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

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
