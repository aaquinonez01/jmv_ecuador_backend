import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Subtype } from './subtype.entity';
import { Post } from 'src/posts/entities';

@Entity()
export class ActivityType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  icon: string;

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

  @OneToMany(() => Subtype, (subtype) => subtype.activityType, {
    cascade: true,
    eager: true,
  })
  subtypes: Subtype[];

  @OneToMany(() => Post, (post) => post.activityType, {
    cascade: true,
  })
  posts: Post[];
}
