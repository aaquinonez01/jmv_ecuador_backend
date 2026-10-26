// Rutas de la web pública que muestran cada grupo de espacios de foto.
// El id de un espacio es "<página>.<uso>" (p. ej. "home.hero", "pilares.comunidad"),
// así que además del tag 'site_images' se revalida la ruta de su página.
const PAGE_PATHS: Record<string, string[]> = {
  home: ['/'],
  'quienes-somos': ['/quienes-somos'],
  historia: ['/quienes-somos/historia'],
  estatutos: ['/quienes-somos/estatutos'],
  estructura: ['/estructura'],
  pilares: ['/pilares'],
  formacion: ['/formacion'],
  ejes: ['/formacion/ejes'],
  santos: ['/formacion/santos'],
  'jmv-mundo': ['/jmv-en-el-mundo'],
  actividades: ['/actividades'],
  unete: ['/unete'],
  contacto: ['/contacto'],
  donar: ['/donar'],
  blog: ['/blog'],
  calendario: ['/calendario'],
  biblioteca: ['/biblioteca'],
};

export function pathsForSection(section: string): string[] {
  const page = section.split('.')[0];
  return PAGE_PATHS[page] ?? ['/'];
}

const VERSION = /^v\d+$/;

/**
 * Deduce el public_id de Cloudinary a partir de la URL segura que se guardó al
 * subir (…/image/upload/v123/carpeta/archivo.jpg). Sirve para las fotos antiguas
 * que no guardaron su public_id. Si la URL llevara transformaciones, van antes
 * de la versión y también se descartan.
 */
export function publicIdFromUrl(url: string): string | null {
  try {
    const { hostname, pathname } = new URL(url);
    if (hostname !== 'res.cloudinary.com') return null;
    const marker = '/upload/';
    const at = pathname.indexOf(marker);
    if (at === -1) return null;
    const segments = pathname.slice(at + marker.length).split('/');
    const version = segments.findIndex((segment) => VERSION.test(segment));
    const rest = decodeURIComponent(segments.slice(version + 1).join('/'));
    return rest.replace(/\.[a-z0-9]+$/i, '') || null;
  } catch {
    return null;
  }
}
