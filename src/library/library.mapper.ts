import type { Request } from 'express';
import type { LibraryDocument } from './entities/library-document.entity';

const DEFAULT_PUBLIC_API_URL = 'https://api.jmvecuador.org/api';

// Base pública de la API para construir fileUrl. En desarrollo, si no hay
// PUBLIC_API_URL, se usa el host de la propia petición.
export function publicApiBase(req?: Request) {
  const configured = process.env.PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (process.env.NODE_ENV !== 'production' && req?.get('host')) {
    return `${req.protocol}://${req.get('host')}/api`;
  }
  return DEFAULT_PUBLIC_API_URL;
}

export const documentFileUrl = (base: string, id: string) =>
  `${base}/library/documents/${id}/file`;

// Lo que ve cualquier visitante: nunca filePath ni coverPublicId, y sin
// fileUrl para los documentos solo para miembros.
export function toPublicDocument(item: LibraryDocument, base: string) {
  const hasFile = item.kind === 'pdf' && Boolean(item.filePath);
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    author: item.author ?? null,
    summary: item.summary,
    description: item.description ?? null,
    kind: item.kind,
    type: item.type,
    axis: item.axis ?? null,
    stage: item.stage,
    tags: item.tags ?? [],
    visibility: item.visibility,
    coverUrl: item.coverUrl ?? null,
    externalUrl: item.externalUrl ?? null,
    fileUrl:
      hasFile && item.visibility === 'publico'
        ? documentFileUrl(base, item.id)
        : null,
    hasFile,
    fileSize: item.fileSize ?? null,
    pageCount: item.pageCount ?? null,
    readingMinutes: item.readingMinutes ?? null,
    featured: item.featured,
    published: item.published,
    displayOrder: item.displayOrder,
    views: item.views,
    downloads: item.downloads,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// Para el panel: el admin puede abrir cualquier archivo con su token
export function toAdminDocument(item: LibraryDocument, base: string) {
  const hasFile = item.kind === 'pdf' && Boolean(item.filePath);
  return {
    ...toPublicDocument(item, base),
    fileUrl: hasFile ? documentFileUrl(base, item.id) : null,
    fileName: item.fileName ?? null,
    fileMime: item.fileMime ?? null,
  };
}

export function slugify(text: string, fallback: string) {
  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
  return slug || fallback;
}

// Multer entrega el nombre original en latin1; se recupera el UTF-8 (tildes)
export function originalFileName(file: Express.Multer.File) {
  const raw = file.originalname ?? '';
  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  const name = decoded.includes('\uFFFD') ? raw : decoded;
  return name.replace(/[\r\n"\\/]/g, '_').slice(0, 255) || 'documento.pdf';
}
