import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { LibraryCollection } from './entities/library-collection.entity';
import { LibraryCollectionItem } from './entities/library-collection-item.entity';
import { LibraryDocument } from './entities/library-document.entity';
import { LibraryCollectionsController } from './library-collections.controller';
import { LibraryCollectionsService } from './library-collections.service';
import { LibraryDocumentsController } from './library-documents.controller';
import { LibraryDocumentsService } from './library-documents.service';
import { getLibraryStorageDir } from './storage/library-storage';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LibraryDocument,
      LibraryCollection,
      LibraryCollectionItem,
    ]),
    AuthModule,
    CommonModule,
  ],
  controllers: [LibraryDocumentsController, LibraryCollectionsController],
  providers: [LibraryDocumentsService, LibraryCollectionsService],
})
export class LibraryModule implements OnModuleInit {
  onModuleInit() {
    // Crea la carpeta de los PDF al arrancar (falla pronto si no hay permisos)
    getLibraryStorageDir();
  }
}
