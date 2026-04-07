import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  role: string;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ type: 'text' })
  quote: string;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'bool', default: true })
  active: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

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
}
