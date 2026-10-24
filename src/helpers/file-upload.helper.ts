import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

function bufferToStream(buffer: Buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

// Transformación entrante: Cloudinary guarda el original reducido a máx. 2000px
// y recomprimido, así no se sirven fotos de cámara de 5-10 MB.
const IMAGE_INCOMING_TRANSFORMATION = [
  { width: 2000, height: 2000, crop: 'limit', quality: 'auto:good' },
];

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  // Cloudinary devuelve los errores como objetos { message, http_code }
  if (error && typeof error === 'object' && 'message' in error) {
    const { message, http_code } = error as {
      message: unknown;
      http_code?: number;
    };
    const code = http_code ? ` (HTTP ${http_code})` : '';
    return new Error(`Cloudinary: ${String(message)}${code}`);
  }
  return new Error('Error desconocido al subir la imagen');
}

export async function uploadImages(
  files: Express.Multer.File[],
): Promise<string[]> {
  if (!files || files.length === 0) {
    return [];
  }

  const uploads = files.map(
    (file) =>
      new Promise<string>((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          {
            folder: 'jmv_ecuador/posts/images',
            transformation: IMAGE_INCOMING_TRANSFORMATION,
          },
          (err, result) => {
            if (err) {
              reject(toError(err));
            } else if (!result) {
              reject(new Error('Error al subir la imagen: resultado vacío'));
            } else {
              resolve(result.secure_url);
            }
          },
        );
        bufferToStream(file.buffer).pipe(upload);
      }),
  );

  return Promise.all(uploads);
}

export async function uploadSingleImage(
  file: Express.Multer.File,
  folder: string,
): Promise<string | null> {
  if (!file) {
    return null;
  }

  return new Promise<string>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, transformation: IMAGE_INCOMING_TRANSFORMATION },
      (err, result) => {
        if (err) {
          reject(toError(err));
        } else if (!result) {
          reject(new Error('Error al subir la imagen: resultado vacío'));
        } else {
          resolve(result.secure_url);
        }
      },
    );
    bufferToStream(file.buffer).pipe(upload);
  });
}

export async function uploadImagesToFolder(
  files: Express.Multer.File[],
  folder: string,
): Promise<string[]> {
  if (!files || files.length === 0) {
    return [];
  }

  return Promise.all(
    files.map((file) => uploadSingleImage(file, folder) as Promise<string>),
  );
}

export async function uploadSingleRawFile(
  file: Express.Multer.File,
  folder: string,
): Promise<string | null> {
  if (!file) {
    return null;
  }

  return new Promise<string>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw',
        public_id: file.originalname.replace(/\.[^/.]+$/, ''),
      },
      (err, result) => {
        if (err) {
          reject(toError(err));
        } else if (!result) {
          reject(new Error('Error al subir el archivo: resultado vacio'));
        } else {
          resolve(result.secure_url);
        }
      },
    );
    bufferToStream(file.buffer).pipe(upload);
  });
}

export async function uploadRawFilesToFolder(
  files: Express.Multer.File[],
  folder: string,
): Promise<string[]> {
  if (!files || files.length === 0) {
    return [];
  }

  return Promise.all(
    files.map((file) => uploadSingleRawFile(file, folder) as Promise<string>),
  );
}

export async function uploadAvatar(
  file: Express.Multer.File,
): Promise<string | null> {
  return uploadSingleImage(file, 'jmv_ecuador/users/avatars');
}

// Igual que uploadSingleImage, pero devuelve también el public_id para poder
// borrar la imagen de Cloudinary cuando se reemplaza o se quita.
export async function uploadImageWithPublicId(
  file: Express.Multer.File,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, transformation: IMAGE_INCOMING_TRANSFORMATION },
      (err, result) => {
        if (err) {
          reject(toError(err));
        } else if (!result) {
          reject(new Error('Error al subir la imagen: resultado vacío'));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      },
    );
    bufferToStream(file.buffer).pipe(upload);
  });
}

export async function deleteImageByPublicId(publicId?: string | null) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}
