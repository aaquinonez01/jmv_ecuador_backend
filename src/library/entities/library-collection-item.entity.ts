import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { LibraryCollection } from './library-collection.entity';
import { LibraryDocument } from './library-document.entity';

@Index('idx_library_collection_items_document', ['documentId'])
@Entity('library_collection_items')
export class LibraryCollectionItem {
  @PrimaryColumn('uuid')
  collectionId!: string;

  @PrimaryColumn('uuid')
  documentId!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @ManyToOne(() => LibraryCollection, (collection) => collection.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collectionId' })
  collection?: LibraryCollection;

  @ManyToOne(() => LibraryDocument, (document) => document.collectionItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document?: LibraryDocument;
}
