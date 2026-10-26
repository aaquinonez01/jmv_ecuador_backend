import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityPillar } from 'src/activity_pillars/entities/activity-pillar.entity';
import { Activity } from 'src/activities/entities/activity.entity';
import { UpcomingActivity } from 'src/upcoming_activities/entities/upcoming-activity.entity';

@Entity('activity_types_catalog')
export class ActivityTypeCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  icon?: string;

  @Column({ type: 'text', nullable: true })
  color?: string;

  @Column({ type: 'bool', default: true })
  active: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // Un pilar tiene muchos tipos; nullable solo para los tipos creados antes de esta regla
  @Column({ type: 'uuid', nullable: true })
  pillarId?: string | null;

  @ManyToOne(() => ActivityPillar, (pillar) => pillar.types, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'pillarId' })
  pillar?: ActivityPillar | null;

  @OneToMany(() => Activity, (activity) => activity.type)
  activities?: Activity[];

  @OneToMany(() => UpcomingActivity, (activity) => activity.type)
  upcomingActivities?: UpcomingActivity[];
}
