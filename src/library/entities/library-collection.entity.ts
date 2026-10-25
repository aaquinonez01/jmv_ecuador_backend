import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LibraryCollectionItem } from './library-collection-item.entity';

// Ruta de formación: lecturas ordenadas
@Index('idx_library_collections_published_order', ['published', 'displayOrder'])
@Entity('library_collections')
export class LibraryCollection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 140, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  coverUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  coverPublicId?: string | null;

  @Column({ type: 'bool', default: true })
  published!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @OneToMany(() => LibraryCollectionItem, (item) => item.collection)
  items?: LibraryCollectionItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
