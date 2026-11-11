import { User } from 'src/auth/entities/user';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const POINT_REASONS = [
  'quiz_live',
  'admin',
  'redeem',
  'refund',
  'game',
  'reto',
  'training',
] as const;
export type PointReason = (typeof POINT_REASONS)[number];

// Libro de movimientos: solo se agregan filas (sql/2026-11-puntos.sql)
@Index('idx_points_tx_user', ['user', 'createdAt'])
// Un mismo motivo no se paga dos veces por la misma referencia
@Index('uq_points_tx_ref', ['user', 'reason', 'refId'], {
  unique: true,
  where: '"refId" IS NOT NULL',
})
@Entity('points_transactions')
export class PointsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 20 })
  reason!: PointReason;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'uuid', nullable: true })
  refId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('points_rules')
export class PointsRule {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  key!: string;

  @Column({ type: 'text' })
  label!: string;

  @Column({ type: 'text', nullable: true })
  hint?: string | null;

  @Column({ type: 'int' })
  points!: number;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;
}
