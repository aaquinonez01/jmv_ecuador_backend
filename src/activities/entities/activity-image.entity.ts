import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { Activity } from './activity.entity';

@Index('idx_activity_images_activity', ['activity'])
@Entity('activity_images')
export class ActivityImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', nullable: true })
  alt?: string;

  @Column({ type: 'text', nullable: true })
  filename?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => Activity, (activity) => activity.gallery, {
    onDelete: 'CASCADE',
  })
  activity: Activity;
}
