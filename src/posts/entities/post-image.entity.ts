import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Post } from './post.entity';

@Entity()
export class PostImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
  })
  url: string;

  @ManyToOne(() => Post, (post) => post.images, {
    onDelete: 'CASCADE',
  })
  post: Post;
}
