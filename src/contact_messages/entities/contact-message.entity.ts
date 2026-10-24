import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const ORIGENES_CONTACTO = ['contacto', 'unete'] as const;
export type OrigenContacto = (typeof ORIGENES_CONTACTO)[number];

@Index('idx_contact_messages_leido_created', ['leido', 'createdAt'])
@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 150 })
  asunto!: string;

  @Column({ type: 'text' })
  mensaje!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ciudad?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'contacto' })
  origen!: OrigenContacto;

  @Column({ type: 'bool', default: false })
  leido!: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;
}
