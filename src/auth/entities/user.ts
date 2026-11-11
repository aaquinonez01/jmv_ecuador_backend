import { Comunidad } from 'src/comunidades/entities/comunidad.entity';
import { Post } from 'src/posts/entities';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Index('idx_user_comunidad', ['comunidad'])
@Index('idx_user_member_status', ['memberStatus'])
@Index('uq_user_friend_code', ['friendCode'], {
  unique: true,
  where: '"friendCode" IS NOT NULL',
})
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

  // Los JWT emitidos antes de este momento dejan de valer (p. ej. tras restablecer la contraseña)
  @Column({ type: 'timestamp', nullable: true })
  passwordChangedAt?: Date | null;

  @Column('date', { nullable: true })
  birthDate: Date;

  @Column('text')
  phoneNumber: string;

  @Column('text', { nullable: true })
  nameComunity?: string | null;

  @Column('text')
  address: string;

  @Column('text')
  bio: string;

  // ── Miembro de JMV (sección por edad y verificación para canjear puntos) ──

  // 'infancia' | 'prejuvenil' | 'juvenil'
  @Column({ type: 'varchar', length: 20, nullable: true })
  level?: string | null;

  // 'none' | 'pending' | 'verified' | 'rejected'
  @Column({ type: 'varchar', length: 12, default: 'none' })
  memberStatus: string;

  @Column({ type: 'timestamp', nullable: true })
  memberRequestedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  memberVerifiedAt?: Date | null;

  // Saldo en caché; la verdad está en points_transactions
  @Column({ type: 'int', default: 0 })
  pointsBalance: number;

  // Código para agregarse como amigos (se genera la primera vez)
  @Column({ type: 'varchar', length: 8, nullable: true })
  friendCode?: string | null;

  // Estrellas del juego (no se canjean)
  @Column({ type: 'int', default: 0 })
  starsBalance: number;

  @OneToMany(() => Post, (post) => post.user, {
    cascade: true,
  })
  posts?: Post[];

  @ManyToOne(() => Comunidad, (comunidad) => comunidad.usuarios, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: true,
  })
  comunidad?: Comunidad | null;
}
