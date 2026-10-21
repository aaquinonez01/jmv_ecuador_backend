import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { UpcomingActivity } from './upcoming-activity.entity';

@Index('idx_upcoming_activity_documents_activity', ['upcomingActivity'])
@Entity('upcoming_activity_documents')
export class UpcomingActivityDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  fileType?: string;

  @Column({ type: 'text', nullable: true })
  documentType?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => UpcomingActivity, (activity) => activity.documents, {
    onDelete: 'CASCADE',
  })
  upcomingActivity: UpcomingActivity;
}
