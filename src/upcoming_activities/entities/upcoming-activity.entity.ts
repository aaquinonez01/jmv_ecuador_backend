import { ActivityPillar } from 'src/activity_pillars/entities/activity-pillar.entity';
import { ActivityTypeCatalog } from 'src/activity_types/entities/activity-type.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UpcomingActivityDocument } from './upcoming-activity-document.entity';

@Entity('upcoming_activities')
export class UpcomingActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  maxRegistrationDate?: Date;

  @Column({ type: 'text', nullable: true })
  externalUrl?: string;

  @Column({ type: 'text', nullable: true })
  participantsLabel?: string;

  @Column({ type: 'text', nullable: true })
  registrationStatus?: string;

  @Column({ type: 'text', nullable: true, default: 'event' })
  countdownTargetType?: string;

  @Column({ type: 'text', nullable: true })
  coverImageUrl?: string;

  @Column({ type: 'bool', default: true })
  published: boolean;

  @Column({ type: 'bool', default: false })
  featuredInHome: boolean;

  @Column({ type: 'bool', default: true })
  showInHome: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

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

  @ManyToOne(() => ActivityPillar, (pillar) => pillar.upcomingActivities, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  pillar?: ActivityPillar;

  @ManyToOne(() => ActivityTypeCatalog, (type) => type.upcomingActivities, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  type?: ActivityTypeCatalog;

  @OneToMany(() => UpcomingActivityDocument, (document) => document.upcomingActivity, {
    cascade: true,
    eager: true,
  })
  documents?: UpcomingActivityDocument[];
}
