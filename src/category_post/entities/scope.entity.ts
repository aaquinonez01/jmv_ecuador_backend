import { Post } from 'src/posts/entities';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Scope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'text',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  icon: string;

  @Column({
    nullable: true,
  })
  color: string;

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

  @OneToMany(() => Post, (post) => post.scope, {
    cascade: true,
  })
  posts: Post[];
}
