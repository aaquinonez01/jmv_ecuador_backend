import { ActivityPillar } from 'src/activity_pillars/entities/activity-pillar.entity';
import { ActivityTypeCatalog } from 'src/activity_types/entities/activity-type.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityImage } from './activity-image.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ type: 'text', nullable: true })
  participantsLabel?: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ type: 'text', nullable: true })
  coverImageUrl?: string;

  @Column({ type: 'bool', default: true })
  published: boolean;

  @Column({ type: 'bool', default: false })
  featured: boolean;

  @Column({ type: 'bool', default: true })
  showInActivitiesPage: boolean;

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

  @ManyToOne(() => ActivityPillar, (pillar) => pillar.activities, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  pillar?: ActivityPillar;

  @ManyToOne(() => ActivityTypeCatalog, (type) => type.activities, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  type?: ActivityTypeCatalog;

  @OneToMany(() => ActivityImage, (image) => image.activity, {
    cascade: true,
    eager: true,
  })
  gallery?: ActivityImage[];
}
