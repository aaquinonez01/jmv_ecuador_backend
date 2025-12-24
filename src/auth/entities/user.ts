import { Post } from 'src/posts/entities';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id?: string | null;

  @Column({
    type: 'text',
    nullable: false,
    unique: true,
  })
  email: string;

  @Column('text')
  password: string;

  @Column('text')
  fullName: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  displayName: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  profilePicture: string;

  @Column('text', {
    default: 'user',
  })
  role: string;

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

  @Column('bool', { default: true })
  isActive: boolean;

  @Column('date', { nullable: true })
  birthDate: Date;

  @Column('text')
  phoneNumber: string;

  @Column('text')
  address: string;

  @Column('text')
  bio: string;

  @OneToMany(() => Post, (post) => post.user, {
    cascade: true,
  })
  posts?: Post[];
}
