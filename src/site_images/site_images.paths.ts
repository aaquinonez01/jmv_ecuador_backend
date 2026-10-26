// Rutas de la web pública que muestran cada grupo de espacios de foto.
// El id de un espacio es "<página>.<uso>" (p. ej. "home.hero", "pilares.comunidad"),
// así que además del tag 'site_images' se revalida la ruta de su página.
// Las rutas se expiran al momento (revalidatePath), a diferencia del tag, que
// se sirve "stale-while-revalidate": así nadie recibe una foto ya borrada.
const PAGE_PATHS: Record<string, string[]> = {
  home: ['/'],
  'quienes-somos': ['/quienes-somos'],
  historia: ['/quienes-somos/historia'],
  // La cabecera también se ve en cada versión de los estatutos. La web
  // revalida las rutas con "[...]" como patrón (todas sus páginas).
  estatutos: ['/quienes-somos/estatutos', '/quienes-somos/estatutos/[slug]'],
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

// Espacios que además se muestran en otra página (id completo → rutas extra).
// Las cabeceras de ejes, santos y pilares ilustran las tarjetas de /formacion.
const EXTRA_PATHS: Record<string, string[]> = {
  'ejes.hero': ['/formacion'],
  'santos.hero': ['/formacion'],
  'pilares.hero': ['/formacion'],
};

export function pathsForSection(section: string): string[] {
  const page = section.split('.')[0];
  const own = PAGE_PATHS[page] ?? ['/'];
  return [...new Set([...own, ...(EXTRA_PATHS[section] ?? [])])];
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
