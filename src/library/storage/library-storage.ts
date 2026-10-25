import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createWriteStream, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import { Transform } from 'stream';
import type { Request } from 'express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { StorageEngine } from 'multer';

export const LIBRARY_MAX_PDF_BYTES = 50 * 1024 * 1024;
export const LIBRARY_MAX_COVER_BYTES = 10 * 1024 * 1024;

const PDF_MIME_TYPES = ['application/pdf', 'application/x-pdf'];
const COVER_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];
// Solo nombres generados por el servidor: evita path traversal
const STORED_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

let storageDir: string | null = null;

export function getLibraryStorageDir() {
  if (!storageDir) {
    const configured = process.env.LIBRARY_STORAGE_DIR?.trim();
    storageDir = configured
      ? isAbsolute(configured)
        ? configured
        : resolve(process.cwd(), configured)
      : join(process.cwd(), 'uploads', 'library');
    mkdirSync(storageDir, { recursive: true });
  }
  return storageDir;
}

export function resolveStoredFile(name?: string | null) {
  if (!name || !STORED_NAME.test(name)) return null;
  return join(getLibraryStorageDir(), name);
}

export async function removeStoredFile(name?: string | null) {
  const path = resolveStoredFile(name);
  if (!path) return;
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

const invalidPdf = () =>
  new BadRequestException('El archivo no es un PDF válido');

// "file" (PDF) se escribe directo al disco con nombre aleatorio y se comprueba
// la firma %PDF-; "cover" queda en memoria para subirla a Cloudinary.
class LibraryStorageEngine implements StorageEngine {
  _handleFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
  ) {
    if (file.fieldname === 'cover') return this.handleCover(file, callback);

    const dir = getLibraryStorageDir();
    const filename = `${randomUUID()}.pdf`;
    const path = join(dir, filename);
    const out = createWriteStream(path, { flags: 'wx' });

    let head = Buffer.alloc(0);
    let verified = false;
    let size = 0;
    let finished = false;

    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      file.stream.unpipe();
      file.stream.resume();
      out.destroy();
      unlink(path)
        .catch(() => undefined)
        .finally(() => callback(error));
    };

    const checker = new Transform({
      transform(chunk: Buffer, _encoding, next) {
        size += chunk.length;
        if (verified) return next(null, chunk);
        head = Buffer.concat([head, chunk]);
        if (head.length < 5) return next();
        if (head.subarray(0, 5).toString('latin1') !== '%PDF-') {
          return next(invalidPdf());
        }
        verified = true;
        const pending = head;
        head = Buffer.alloc(0);
        next(null, pending);
      },
      flush(next) {
        next(verified ? null : invalidPdf());
      },
    });

    checker.on('error', fail);
    out.on('error', fail);
    out.on('finish', () => {
      if (finished) return;
      finished = true;
      callback(null, { destination: dir, filename, path, size });
    });
    file.stream.on('error', fail);
    file.stream.pipe(checker).pipe(out);
  }

  private handleCover(
    file: Express.Multer.File,
    callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
  ) {
    const chunks: Buffer[] = [];
    let size = 0;
    let finished = false;
    file.stream.on('data', (chunk: Buffer) => {
      if (finished) return;
      size += chunk.length;
      if (size > LIBRARY_MAX_COVER_BYTES) {
        finished = true;
        chunks.length = 0;
        file.stream.resume();
        return callback(
          new BadRequestException('La portada puede pesar hasta 10 MB'),
        );
      }
      chunks.push(chunk);
    });
    file.stream.on('error', (error) => {
      if (finished) return;
      finished = true;
      callback(error);
    });
    file.stream.on('end', () => {
      if (finished) return;
      finished = true;
      callback(null, { buffer: Buffer.concat(chunks), size });
    });
  }

  _removeFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ) {
    if (file.fieldname !== 'file' || !file.filename) return callback(null);
    removeStoredFile(file.filename)
      .then(() => callback(null))
      .catch((error: Error) => callback(error));
  }
}

export const libraryMulterConfig: MulterOptions = {
  storage: new LibraryStorageEngine(),
  limits: {
    fileSize: LIBRARY_MAX_PDF_BYTES,
    files: 2,
  },
  fileFilter: (_req, file, callback) => {
    if (file.fieldname === 'file' && !PDF_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Solo se permiten archivos PDF'),
        false,
      );
    }
    if (
      file.fieldname === 'cover' &&
      !COVER_MIME_TYPES.includes(file.mimetype)
    ) {
      return callback(
        new BadRequestException(
          'La portada debe ser una imagen (jpeg, jpg, png, webp, gif)',
        ),
        false,
      );
    }
    callback(null, true);
  },
};

export const coverMulterConfig: MulterOptions = {
  ...libraryMulterConfig,
  limits: { fileSize: LIBRARY_MAX_COVER_BYTES, files: 1 },
};
