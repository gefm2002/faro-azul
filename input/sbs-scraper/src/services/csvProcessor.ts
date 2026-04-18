import Papa from 'papaparse';
import { extractSpec, getBestImageUrl, getPrice } from './vtexApi';
import type { VtexProduct } from './vtexApi';

// Input row from the user's CSV (21 columns - matches Inputs.csv structure)
export interface InputRow {
  isbn: string;        // Código de barras
  sku: string;         // SKU
  nombre: string;      // Nombre (may be pre-filled)
  precio: string;      // Precio
  stock: string;       // Stock
  peso: string;        // Peso (kg) - defaults
  alto: string;        // Alto (cm)
  ancho: string;       // Ancho (cm)
  profundidad: string; // Profundidad (cm)
  raw: Record<string, string>; // original row
}

// Output row (33 columns - matches Settings.csv)
export interface OutputRow {
  'Identificador de URL': string;
  'Nombre': string;
  'Categorías': string;
  'Precio': string;
  'Precio promocional': string;
  'Peso (kg)': string;
  'Alto (cm)': string;
  'Ancho (cm)': string;
  'Profundidad (cm)': string;
  'Stock': string;
  'SKU': string;
  'Código de barras': string;
  'Mostrar en tienda': string;
  'Envío sin cargo': string;
  'Descripción': string;
  'Tags': string;
  'Título para SEO': string;
  'Descripción para SEO': string;
  'Marca': string;
  'Producto Físico': string;
  'MPN (Número de pieza del fabricante)': string;
  'Sexo': string;
  'Rango de edad': string;
  'Costo': string;
  // New columns (rq)
  'Autor': string;
  'Pag.': string;
  'EDAD': string;
  'FOTO TAPA': string;
  'Encuadernación': string;
  'Trailer/Video': string;
  'Descripción Completa': string;
  // Meta
  _imageUrl: string;
  _isbn: string;
  _status: 'ok' | 'error' | 'pending';
  _error?: string;
}

// Default values (marked as "defecto" in Settings)
const DEFAULTS = {
  'Peso (kg)': '0.5',
  'Alto (cm)': '18',
  'Ancho (cm)': '13',
  'Profundidad (cm)': '1',
  'Mostrar en tienda': 'SI',
  'Envío sin cargo': 'NO',
  'Producto Físico': 'SI',
  'Sexo': 'Unisex',
  'Trailer/Video': '',
};

export function parseInputCSV(csvText: string): InputRow[] {
  // The input CSV appears to be in a vertical format (field, value) not tabular
  // Let's parse it properly
  const result = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const rows: InputRow[] = [];
  
  // Check if it's vertical (key-value pairs per product) or horizontal (header row + data)
  if (result.data.length === 0) return [];
  
  const firstRow = result.data[0];
  
  // If first cell looks like a field name ("Identificador de URL"), it's vertical
  if (typeof firstRow[0] === 'string' && firstRow[0].includes('Identificador')) {
    // Vertical format: each column after first is a product
    const fields = result.data.map(r => r[0]);
    const numProducts = (result.data[0]?.length ?? 1) - 1;
    
    for (let col = 1; col <= numProducts; col++) {
      const raw: Record<string, string> = {};
      fields.forEach((field, i) => {
        raw[field] = result.data[i]?.[col] ?? '';
      });
      
      const isbn = raw['Código de barras'] ?? '';
      if (!isbn) continue;
      
      rows.push({
        isbn: isbn.trim(),
        sku: raw['SKU'] ?? '',
        nombre: raw['Nombre'] ?? '',
        precio: raw['Precio'] ?? '',
        stock: raw['Stock'] ?? '2',
        peso: raw['Peso (kg)'] ?? DEFAULTS['Peso (kg)'],
        alto: raw['Alto (cm)'] ?? DEFAULTS['Alto (cm)'],
        ancho: raw['Ancho (cm)'] ?? DEFAULTS['Ancho (cm)'],
        profundidad: raw['Profundidad (cm)'] ?? DEFAULTS['Profundidad (cm)'],
        raw,
      });
    }
    return rows;
  }
  
  // Horizontal format: first row = headers
  const headers = result.data[0] as string[];
  for (let i = 1; i < result.data.length; i++) {
    const r = result.data[i] as string[];
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => { raw[h] = r[idx] ?? ''; });
    
    const isbn = raw['Código de barras'] ?? raw['isbn'] ?? raw['ISBN'] ?? r[0] ?? '';
    if (!isbn.trim()) continue;
    
    rows.push({
      isbn: isbn.trim(),
      sku: raw['SKU'] ?? '',
      nombre: raw['Nombre'] ?? '',
      precio: raw['Precio'] ?? '',
      stock: raw['Stock'] ?? '2',
      peso: raw['Peso (kg)'] ?? DEFAULTS['Peso (kg)'],
      alto: raw['Alto (cm)'] ?? DEFAULTS['Alto (cm)'],
      ancho: raw['Ancho (cm)'] ?? DEFAULTS['Ancho (cm)'],
      profundidad: raw['Profundidad (cm)'] ?? DEFAULTS['Profundidad (cm)'],
      raw,
    });
  }
  return rows;
}

// Parse a plain ISBN list (one per line)
export function parseISBNList(text: string): InputRow[] {
  const isbns = text.split(/[\n,;]+/).map(s => s.trim()).filter(s => /^\d{10,13}$/.test(s));
  return isbns.map(isbn => ({
    isbn,
    sku: '',
    nombre: '',
    precio: '',
    stock: '2',
    peso: DEFAULTS['Peso (kg)'],
    alto: DEFAULTS['Alto (cm)'],
    ancho: DEFAULTS['Ancho (cm)'],
    profundidad: DEFAULTS['Profundidad (cm)'],
    raw: { 'Código de barras': isbn },
  }));
}

// Build composed description (the rq field)
export function buildDescription(product: VtexProduct, isbn: string): string {
  const nombre = product.productName ?? '';
  const desc = stripHtml(product.description ?? '');
  const autor = extractSpec(product, 'Autor') || extractSpec(product, 'autor');
  const paginas = extractSpec(product, 'Paginas') || extractSpec(product, 'pag') || extractSpec(product, 'Pag.');
  const edad = extractSpec(product, 'Edad') || extractSpec(product, 'EDAD') || extractSpec(product, 'Rango de edad');
  const editorial = product.brand ?? '';
  const encuadernacion = extractSpec(product, 'Encuadernacion') || extractSpec(product, 'Encuadernación') || 'Tapa rústica';
  
  let composed = `${nombre}  <br>  <br>  DESCRIPCION  <br><br>${desc}`;
  if (autor) composed += `  <br><br>AUTOR/A ${autor}`;
  if (paginas) composed += `  <br><br>CANTIDAD DE PAGINAS ${paginas}`;
  if (edad) composed += `  <br>  <br>EDAD SUGERIDA ${edad}`;
  if (editorial) composed += `  <br><br>EDITORIAL ${editorial}`;
  composed += `  <br><br>ISBN ${isbn}`;
  if (encuadernacion) composed += `  <br><br>FICHA TECNICA: ${encuadernacion}`;
  
  return composed;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Build tags from category
export function buildTags(product: VtexProduct): string {
  const cats = product.categories ?? [];
  if (cats.length === 0) return 'LIBRO';
  const cat = cats[cats.length - 1] ?? cats[0] ?? '';
  // Extract leaf category name
  const parts = cat.split('/').filter(Boolean);
  const leaf = parts[parts.length - 1]?.toUpperCase() ?? '';
  return `LIBRO ${leaf}`;
}

// Build SEO description
export function buildSeoDesc(nombre: string, tags: string, categoria: string): string {
  return `${nombre}${tags}${categoria}`;
}

// Map a product from VTEX to the 33-column output
export function buildOutputRow(input: InputRow, product: VtexProduct | null): OutputRow {
  if (!product) {
    return {
      'Identificador de URL': '',
      'Nombre': input.nombre || '',
      'Categorías': '',
      'Precio': input.precio || '',
      'Precio promocional': '',
      'Peso (kg)': input.peso || DEFAULTS['Peso (kg)'],
      'Alto (cm)': input.alto || DEFAULTS['Alto (cm)'],
      'Ancho (cm)': input.ancho || DEFAULTS['Ancho (cm)'],
      'Profundidad (cm)': input.profundidad || DEFAULTS['Profundidad (cm)'],
      'Stock': input.stock || '2',
      'SKU': input.sku,
      'Código de barras': input.isbn,
      'Mostrar en tienda': DEFAULTS['Mostrar en tienda'],
      'Envío sin cargo': DEFAULTS['Envío sin cargo'],
      'Descripción': '',
      'Tags': 'LIBRO',
      'Título para SEO': '',
      'Descripción para SEO': '',
      'Marca': '',
      'Producto Físico': DEFAULTS['Producto Físico'],
      'MPN (Número de pieza del fabricante)': input.isbn,
      'Sexo': DEFAULTS['Sexo'],
      'Rango de edad': '',
      'Costo': '',
      'Autor': '',
      'Pag.': '',
      'EDAD': '',
      'FOTO TAPA': '',
      'Encuadernación': '',
      'Trailer/Video': '',
      'Descripción Completa': '',
      _imageUrl: '',
      _isbn: input.isbn,
      _status: 'error',
      _error: 'Producto no encontrado en SBS',
    };
  }

  const nombre = product.productName ?? input.nombre;
  const autor = extractSpec(product, 'Autor') || extractSpec(product, 'autor') || '';
  const paginas = extractSpec(product, 'Paginas') || extractSpec(product, 'pag') || extractSpec(product, 'Pag.') || '';
  const edad = extractSpec(product, 'Edad') || extractSpec(product, 'EDAD') || extractSpec(product, 'Rango de edad') || '';
  const encuadernacion = extractSpec(product, 'Encuadernacion') || extractSpec(product, 'Encuadernación') || 'Tapa rústica';
  const categoria = product.categories?.[product.categories.length - 1]?.split('/').filter(Boolean).pop() ?? '';
  const tags = buildTags(product);
  const imageUrl = getBestImageUrl(product);
  const precio = getPrice(product);
  const precioStr = precio > 0 ? precio.toFixed(2) : input.precio;
  const descCorta = product.description ?? '';
  const descCompleta = buildDescription(product, input.isbn);
  const seoTitle = `#${nombre}`;
  const seoDesc = buildSeoDesc(`#${nombre}`, tags, categoria);

  return {
    'Identificador de URL': '',
    'Nombre': `#${nombre}`,
    'Categorías': categoria || 'Adultos',
    'Precio': precioStr,
    'Precio promocional': '',
    'Peso (kg)': input.peso || DEFAULTS['Peso (kg)'],
    'Alto (cm)': input.alto || DEFAULTS['Alto (cm)'],
    'Ancho (cm)': input.ancho || DEFAULTS['Ancho (cm)'],
    'Profundidad (cm)': input.profundidad || DEFAULTS['Profundidad (cm)'],
    'Stock': input.stock || '2',
    'SKU': input.sku || product.items?.[0]?.itemId || '',
    'Código de barras': input.isbn,
    'Mostrar en tienda': DEFAULTS['Mostrar en tienda'],
    'Envío sin cargo': DEFAULTS['Envío sin cargo'],
    'Descripción': descCorta,
    'Tags': tags,
    'Título para SEO': seoTitle,
    'Descripción para SEO': seoDesc,
    'Marca': product.brand ?? '',
    'Producto Físico': DEFAULTS['Producto Físico'],
    'MPN (Número de pieza del fabricante)': input.isbn,
    'Sexo': DEFAULTS['Sexo'],
    'Rango de edad': edad || 'Adultos',
    'Costo': '',
    'Autor': autor,
    'Pag.': paginas,
    'EDAD': edad || 'Adultos',
    'FOTO TAPA': imageUrl,
    'Encuadernación': encuadernacion,
    'Trailer/Video': '',
    'Descripción Completa': descCompleta,
    _imageUrl: imageUrl,
    _isbn: input.isbn,
    _status: 'ok',
  };
}

export const OUTPUT_COLUMNS: (keyof Omit<OutputRow, '_imageUrl' | '_isbn' | '_status' | '_error'>)[] = [
  'Identificador de URL', 'Nombre', 'Categorías', 'Precio', 'Precio promocional',
  'Peso (kg)', 'Alto (cm)', 'Ancho (cm)', 'Profundidad (cm)', 'Stock', 'SKU',
  'Código de barras', 'Mostrar en tienda', 'Envío sin cargo', 'Descripción', 'Tags',
  'Título para SEO', 'Descripción para SEO', 'Marca', 'Producto Físico',
  'MPN (Número de pieza del fabricante)', 'Sexo', 'Rango de edad', 'Costo',
  'Autor', 'Pag.', 'EDAD', 'FOTO TAPA', 'Encuadernación', 'Trailer/Video',
  'Descripción Completa',
];

export function rowsToCsv(rows: OutputRow[]): string {
  const data = rows.map(row => {
    const obj: Record<string, string> = {};
    OUTPUT_COLUMNS.forEach(col => { obj[col] = row[col] ?? ''; });
    return obj;
  });
  return Papa.unparse(data, { columns: OUTPUT_COLUMNS });
}
