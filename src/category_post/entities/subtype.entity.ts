import { Post } from 'src/posts/entities';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { ActivityType } from './activity-type.entity';

@Entity()
@Index(['activityType', 'slug'], { unique: true })
export class Subtype {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'text',
  })
  slug: string;

  @Column({
    default: 0,
  })
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

  @ManyToOne(() => ActivityType, (activityType) => activityType.subtypes, {
    onDelete: 'RESTRICT',
  })
  activityType: ActivityType;

  @OneToMany(() => Post, (post) => post.subtype, {
    cascade: true,
  })
  posts: Post[];
}
