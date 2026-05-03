import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConsejoMember } from './consejo-member.entity';

@Entity('consejo_periods')
export class ConsejoPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ type: 'date' })
  fechaInicio!: string;

  @Column({ type: 'date' })
  fechaFin!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'bool', default: false })
  active!: boolean;

  @OneToMany(() => ConsejoMember, (member) => member.period, {
    cascade: true,
  })
  miembros?: ConsejoMember[];

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
