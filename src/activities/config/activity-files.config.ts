import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const activityFilesMulterConfig: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Tipo de archivo no permitido'),
        false,
      );
    }

    callback(null, true);
  },
};
