import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('activity_categories')
@Unique(['slug'])
export class ActivityCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 140 })
  slug!: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  color?: string | null;

  @Column({ type: 'varchar', length: 48, nullable: true })
  icon?: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

