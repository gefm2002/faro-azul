// VTEX Catalog API para SBS
// Detecta si estamos en Netlify (producción) o dev y usa el proxy correcto

const isDev = import.meta.env.DEV;

// En dev: vite proxy /vtex-api → sbs.com.ar
// En prod Netlify: netlify redirect /vtex-api/* → sbs.com.ar/*
// La API pública de VTEX no requiere auth y generalmente permite CORS,
// pero el proxy garantiza que funcione en cualquier caso.
const API_BASE = isDev ? '/vtex-api' : '/vtex-api';
// Si querés llamar directo (sin proxy) en prod: const API_BASE = 'https://www.sbs.com.ar';

export interface VtexProduct {
  productId: string;
  productName: string;
  brand: string;
  description: string;
  link: string;
  items: VtexItem[];
  categories: string[];
  [key: string]: unknown; // para specs dinámicas
}

export interface VtexItem {
  itemId: string;
  ean: string;
  images: { imageUrl: string; imageLabel: string }[];
  sellers: { commertialOffer: { Price: number; PriceWithoutDiscount: number } }[];
}

export async function searchByISBN(isbn: string): Promise<VtexProduct | null> {
  // Método 1: búsqueda por EAN (más precisa)
  const url1 = `${API_BASE}/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}&_from=0&_to=1`;
  try {
    const resp = await fetch(url1, { headers: { 'Accept': 'application/json' } });
    if (resp.ok) {
      const data: VtexProduct[] = await resp.json();
      if (data?.length > 0) return data[0];
    }
  } catch (e) {
    console.warn('Búsqueda EAN falló:', e);
  }

  // Método 2: Intelligent Search API (mejor soporte CORS)
  const url2 = `${API_BASE}/api/io/_v/api/intelligent-search/product_search?query=${isbn}&count=1`;
  try {
    const resp = await fetch(url2, { headers: { 'Accept': 'application/json' } });
    if (resp.ok) {
      const data = await resp.json();
      const products = data?.products ?? data?.data?.productSearch?.products;
      if (products?.length > 0) {
        // Normalizar formato IS a formato catalog
        return normalizeISProduct(products[0], isbn);
      }
    }
  } catch (e) {
    console.warn('Búsqueda IS falló:', e);
  }

  // Método 3: búsqueda por texto
  const url3 = `${API_BASE}/api/catalog_system/pub/products/search/${isbn}?_from=0&_to=1`;
  try {
    const resp = await fetch(url3, { headers: { 'Accept': 'application/json' } });
    if (resp.ok) {
      const data: VtexProduct[] = await resp.json();
      if (data?.length > 0) return data[0];
    }
  } catch (e) {
    console.warn('Búsqueda texto falló:', e);
  }

  return null;
}

function normalizeISProduct(p: Record<string, unknown>, isbn: string): VtexProduct {
  const items = (p.items as Record<string, unknown>[] | undefined) ?? [];
  return {
    productId: String(p.productId ?? ''),
    productName: String(p.productName ?? ''),
    brand: String(p.brand ?? ''),
    description: String(p.description ?? ''),
    link: String(p.link ?? ''),
    categories: (p.categories as string[] | undefined) ?? [],
    items: items.map(item => ({
      itemId: String(item.itemId ?? ''),
      ean: isbn,
      images: ((item.images ?? item.Videos) as { imageUrl: string; imageLabel: string }[] | undefined) ?? [],
      sellers: ((item.sellers) as { commertialOffer: { Price: number; PriceWithoutDiscount: number } }[] | undefined) ?? [],
    })),
    // Pasar specs del IS al nivel raíz
    ...flattenISSpecs(p),
  };
}

function flattenISSpecs(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const specs = (p.specificationGroups as { specifications: { originalName: string; values: string[] }[] }[] | undefined) ?? [];
  for (const group of specs) {
    for (const spec of group.specifications ?? []) {
      out[spec.originalName] = spec.values;
    }
  }
  return out;
}

// Obtener URL de imagen en alta resolución
export function getBestImageUrl(product: VtexProduct): string {
  const item = product.items?.[0];
  if (!item?.images?.length) return '';
  const imgUrl = item.images[0].imageUrl;
  // Reemplazar tamaño por 1200-auto para alta res
  return imgUrl.replace(/\d+-\d+(\?|$)/, '1200-auto$1').replace(/\d+-auto/, '1200-auto');
}

// Obtener precio
export function getPrice(product: VtexProduct): number {
  try {
    return product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price ?? 0;
  } catch { return 0; }
}

// Extraer spec por nombre (case-insensitive)
export function extractSpec(product: VtexProduct, specName: string): string {
  const p = product as unknown as Record<string, unknown>;
  for (const key of Object.keys(p)) {
    if (key.toLowerCase() === specName.toLowerCase()) {
      const v = p[key];
      if (Array.isArray(v) && v.length > 0) return String(v[0]);
      if (typeof v === 'string') return v;
    }
  }
  return '';
}

// Descargar imagen como base64
export async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    // Intentar con proxy si es URL de SBS
    const urlToFetch = imageUrl.includes('sbs.com.ar') || imageUrl.includes('vtexassets.com')
      ? imageUrl  // las imágenes de vtexassets suelen tener CORS abierto
      : imageUrl;
    
    const resp = await fetch(urlToFetch, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('No se pudo descargar imagen:', imageUrl, e);
    return null;
  }
}
