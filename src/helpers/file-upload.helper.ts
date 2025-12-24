import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

function bufferToStream(buffer: Buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
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
          { folder: 'jmv_ecuador/posts/images' },
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
      { folder },
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

export async function uploadAvatar(
  file: Express.Multer.File,
): Promise<string | null> {
  return uploadSingleImage(file, 'jmv_ecuador/users/avatars');
}
