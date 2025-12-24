import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PostImage } from './post-image.entity';
import { Scope } from 'src/category_post/entities/scope.entity';
import { Subtype } from 'src/category_post/entities/subtype.entity';
import { ActivityType } from 'src/category_post/entities/activity-type.entity';
import { User } from 'src/auth/entities/user';

@Entity()
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column({
    type: 'text',
    nullable: true,
    default: 'moments',
  })
  typePost: string;

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

  @OneToMany(() => PostImage, (postImage) => postImage.post, {
    cascade: true,
    eager: true,
  })
  images?: PostImage[];

  @ManyToOne(() => Scope, (scope) => scope.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  scope?: Scope;

  @ManyToOne(() => ActivityType, (activityType) => activityType.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  activityType?: ActivityType;

  @ManyToOne(() => Subtype, (subtype) => subtype.posts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  subtype?: Subtype;

  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE',
  })
  user: User;
}
