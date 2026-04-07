import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Activity } from './activity.entity';

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
