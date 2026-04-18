import Papa from 'papaparse';
import type { VtexProduct } from './vtexApi';
import { extractSpec, getBestImageUrl } from './vtexApi';

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

// Una fila del CSV de entrada del usuario (puede venir horizontal o vertical)
export interface InputRow {
  isbn: string;        // Código de barras
  sku: string;
  nombre: string;
  precio: string;
  stock: string;
  peso: string;
  alto: string;
  ancho: string;
  profundidad: string;
  raw: Record<string, string>;
}

// 31 columnas de salida (según Settings.csv)
// "Descripción" aparece dos veces: col 15 = corta, col 31 = compuesta
// Las nombramos: "Descripción" y "Descripción Compuesta"
export interface OutputRow {
  'Identificador de URL': string;       // 1
  'Nombre': string;                     // 2  na
  'Categorías': string;                 // 3  na
  'Precio': string;                     // 4  na
  'Precio promocional': string;         // 5  na
  'Peso (kg)': string;                  // 6  defecto=0.5
  'Alto (cm)': string;                  // 7  defecto=18
  'Ancho (cm)': string;                 // 8  defecto=13
  'Profundidad (cm)': string;           // 9  defecto=1
  'Stock': string;                      // 10 na
  'SKU': string;                        // 11 input
  'Código de barras': string;           // 12 input
  'Mostrar en tienda': string;          // 13 defecto=SI
  'Envío sin cargo': string;            // 14 defecto=NO
  'Descripción': string;                // 15 rq (descripción corta de VTEX)
  'Tags': string;                       // 16 rq
  'Título para SEO': string;            // 17 rq
  'Descripción para SEO': string;       // 18 rq
  'Marca': string;                      // 19 rq
  'Producto Físico': string;            // 20 defecto=SI
  'MPN (Número de pieza del fabricante)': string; // 21 = ISBN
  'Sexo': string;                       // 22 rq = Unisex
  'Rango de edad': string;              // 23 rq
  'Costo': string;                      // 24 na
  'Autor': string;                      // 25 rq (NUEVO)
  'Pag.': string;                       // 26 rq (NUEVO)
  'EDAD': string;                       // 27 rq (NUEVO)
  'FOTO TAPA': string;                  // 28 rq (NUEVO)
  'Encuadernación': string;             // 29 rq (NUEVO)
  'Trailer/Video': string;              // 30 na (NUEVO)
  'Descripción Compuesta': string;      // 31 rq (NUEVO - la descripción armada)
  // Campos internos para la UI (no van al CSV)
  _isbn: string;
  _imageUrl: string;
  _status: 'ok' | 'error' | 'pending';
  _error?: string;
}

// Columnas exactas del CSV de salida, en orden (31 columnas)
export const OUTPUT_COLUMNS: (keyof Omit<OutputRow, '_isbn' | '_imageUrl' | '_status' | '_error'>)[] = [
  'Identificador de URL',
  'Nombre',
  'Categorías',
  'Precio',
  'Precio promocional',
  'Peso (kg)',
  'Alto (cm)',
  'Ancho (cm)',
  'Profundidad (cm)',
  'Stock',
  'SKU',
  'Código de barras',
  'Mostrar en tienda',
  'Envío sin cargo',
  'Descripción',
  'Tags',
  'Título para SEO',
  'Descripción para SEO',
  'Marca',
  'Producto Físico',
  'MPN (Número de pieza del fabricante)',
  'Sexo',
  'Rango de edad',
  'Costo',
  'Autor',
  'Pag.',
  'EDAD',
  'FOTO TAPA',
  'Encuadernación',
  'Trailer/Video',
  'Descripción Compuesta',
];

// Valores por defecto (marcados como "defecto" en Settings.csv)
const DEFAULTS: Partial<OutputRow> = {
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

// ─────────────────────────────────────────────
// PARSEO DEL CSV DE ENTRADA
// ─────────────────────────────────────────────

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

function normalizeHeaderKey(h: string): string {
  return stripBom(h).replace(/\r$/, '').trim();
}

/** EAN-13, ISBN-10 (9 dígitos + X) o 10 digitos, quitando guiones / prefijo ISBN. */
export function parseIsbnFromString(s: string): string | null {
  if (!s || typeof s !== 'string') return null;
  const t = stripBom(s).trim();
  if (!t) return null;
  const isbn10ish = t.toUpperCase().replace(/[^0-9X]/g, '');
  if (/^\d{9}X$/.test(isbn10ish)) return isbn10ish;
  const digits = t.replace(/\D/g, '');
  if (digits.length === 13) return digits;
  if (digits.length === 10) return digits;
  if (digits.length === 9 && /X/i.test(t)) return `${digits}X`;
  return null;
}

function getField(raw: Record<string, string>, ...candidates: string[]): string {
  for (const want of candidates) {
    const w = want.toLowerCase();
    for (const k of Object.keys(raw)) {
      if (normalizeHeaderKey(k).toLowerCase() === w) return (raw[k] ?? '').trim();
    }
  }
  return '';
}

/** Valor de celda en el CSV: si trae dato, es la fuente (columnas "na" / "no aplica" en el template de importación). */
function fromInputOr(input: InputRow, keys: string[], computed: string): string {
  for (const k of keys) {
    const v = getField(input.raw, k);
    if (v !== '') return v;
  }
  return computed;
}

/** "Nombre" de salida con un solo prefijo # */
function formatNombreVitrina(n: string): string {
  const t = n.replace(/^#+\s*/, '').trim();
  if (!t) return '';
  return `#${t}`;
}

function countIsbnRowsHorizontalShape(data: string[][]): number {
  if (data.length < 2) return 0;
  const headers = data[0].map((h) => normalizeHeaderKey(String(h ?? '')));
  let c = 0;
  for (let i = 1; i < data.length; i++) {
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) raw[h] = String(data[i]?.[idx] ?? '').trim();
    });
    if (findBarcodeInRow(raw)) c++;
  }
  return c;
}

function findBarcodeInRow(raw: Record<string, string>): string | null {
  const priorityNames = [
    'Código de barras', 'Codigo de barras', 'código de barras', 'codigo de barras',
    'ISBN', 'isbn', 'EAN', 'ean', 'Ean',
    'MPN (Número de pieza del fabricante)', 'MPN', 'mpn',
  ];
  const keys = Object.keys(raw);
  for (const want of priorityNames) {
    const w = normalizeHeaderKey(want).toLowerCase();
    for (const k of keys) {
      if (normalizeHeaderKey(k).toLowerCase() === w) {
        const p = parseIsbnFromString(raw[k] ?? '');
        if (p) return p;
      }
    }
  }
  for (const k of keys) {
    const kn = normalizeHeaderKey(k).toLowerCase();
    if (/(barras|ean|isbn|mpn|codigo|código|barcode)/.test(kn) && !/(precio|nombre|stock|url|título|titulo|descri)/.test(kn)) {
      const p = parseIsbnFromString(raw[k] ?? '');
      if (p) return p;
    }
  }
  for (const v of Object.values(raw)) {
    const p = parseIsbnFromString(v ?? '');
    if (p) return p;
  }
  return null;
}

function parseMatrixBest(csvText: string): string[][] {
  const text = stripBom(csvText);
  const runs = [
    { delimiter: undefined as string | undefined },
    { delimiter: ',' },
    { delimiter: ';' },
    { delimiter: '\t' },
  ] as const;
  let best: string[][] = [];
  let bestScore = -1;
  for (const { delimiter } of runs) {
    const result = Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      header: false,
      ...(delimiter !== undefined ? { delimiter } : {}),
    });
    const data = (result.data ?? []) as string[][];
    if (data.length === 0) continue;
    const hCount = countIsbnRowsHorizontalShape(data);
    const cols = data[0]?.length ?? 0;
    const score = hCount > 0 ? hCount * 10000 + cols : cols;
    if (score > bestScore) {
      bestScore = score;
      best = data;
    }
  }
  return best;
}

export function parseInputCSV(csvText: string): InputRow[] {
  const result = { data: parseMatrixBest(csvText) };
  if (!result.data || result.data.length === 0) return [];

  const firstCell = normalizeHeaderKey(String(result.data[0]?.[0] ?? ''));

  // ── FORMATO VERTICAL (como el ejemplo que me pasaste) ──
  // Fila 0 = ["Identificador de URL", val1, val2, ...]
  // Fila 1 = ["Nombre", val1, val2, ...]
  // etc. → cada columna > 0 es un producto
  // "Nombre" como 1.ª cabecera en horizontal (CSV Excel) se confundía con formato vertical.
  if (firstCell.toLowerCase().includes('identificador de url') || firstCell.toLowerCase().includes('identificador')) {
    return parseVerticalFormat(result.data);
  }

  // ── FORMATO HORIZONTAL (el más común para múltiples productos) ──
  // Fila 0 = headers
  // Fila 1..N = datos
  return parseHorizontalFormat(result.data);
}

function parseVerticalFormat(data: string[][]): InputRow[] {
  const fieldNames = data.map(row => normalizeHeaderKey(String(row[0] ?? '')));
  const numCols = Math.max(...data.map(r => r.length), 0);
  const rows: InputRow[] = [];

  for (let col = 1; col < numCols; col++) {
    const raw: Record<string, string> = {};
    fieldNames.forEach((field, i) => {
      if (field) raw[field] = String(data[i]?.[col] ?? '').trim();
    });
    const isbn = findBarcodeInRow(raw);
    if (!isbn) continue;
    rows.push(rawToInputRow(raw, isbn));
  }
  return rows;
}

function parseHorizontalFormat(data: string[][]): InputRow[] {
  const headers = data[0].map((h) => normalizeHeaderKey(String(h ?? '')));
  const rows: InputRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) raw[h] = String(data[i]?.[idx] ?? '').trim();
    });
    const isbn = findBarcodeInRow(raw);
    if (!isbn) continue;
    rows.push(rawToInputRow(raw, isbn));
  }
  return rows;
}

function rawToInputRow(raw: Record<string, string>, isbn: string): InputRow {
  return {
    isbn,
    sku: getField(raw, 'sku'),
    nombre: getField(raw, 'nombre', '#nombre'),
    precio: getField(raw, 'precio'),
    stock: getField(raw, 'stock'),
    peso: getField(raw, 'peso (kg)') || DEFAULTS['Peso (kg)']!,
    alto: getField(raw, 'alto (cm)') || DEFAULTS['Alto (cm)']!,
    ancho: getField(raw, 'ancho (cm)') || DEFAULTS['Ancho (cm)']!,
    profundidad: getField(raw, 'profundidad (cm)') || DEFAULTS['Profundidad (cm)']!,
    raw,
  };
}

// Lista plana: un código por línea; admite guiones, espacios, prefijo "ISBN"
export function parseISBNList(text: string): InputRow[] {
  const isbns: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/[\n\r,;]+/)) {
    const c = parseIsbnFromString(line);
    if (c && !seen.has(c)) {
      seen.add(c);
      isbns.push(c);
    }
  }

  return isbns.map(isbn => ({
    isbn,
    sku: '',
    nombre: '',
    precio: '',
    stock: '',
    peso: DEFAULTS['Peso (kg)']!,
    alto: DEFAULTS['Alto (cm)']!,
    ancho: DEFAULTS['Ancho (cm)']!,
    profundidad: DEFAULTS['Profundidad (cm)']!,
    raw: { 'Código de barras': isbn },
  }));
}

// ─────────────────────────────────────────────
// CONSTRUCCIÓN DE LA FILA DE SALIDA (31 cols)
// ─────────────────────────────────────────────

export function buildOutputRow(input: InputRow, product: VtexProduct | null): OutputRow {
  if (!product) {
    const nombreM = fromInputOr(input, ['Nombre', 'nombre'], (input.nombre || '').replace(/^#+\s*/, ''));
    const outNombre = nombreM ? formatNombreVitrina(nombreM) : '';
    const catIn = fromInputOr(input, ['Categorías', 'Categorias'], '');
    const edadErr = fromInputOr(
      input,
      [
        'Rango de edad',
        'EDAD',
        'Edad',
        'Rango De Edad',
        'Rango  de  edad (Aproximado)',
      ],
      '',
    );
    const descIn = fromInputOr(
      input,
      ['Descripción', 'Descripcion', 'Descripción '],
      '',
    );
    const compIn = fromInputOr(
      input,
      [
        'Descripción Compuesta',
        'Descripcion compuesta',
        'Descripcion Compuesta',
        'Descripción  Compuesta', // doble col en template
      ],
      '',
    );
    const descripcionYCompError =
      compIn
      || buildDescripcionCompuesta(
        nombreM || input.nombre || 'Producto',
        descIn,
        fromInputOr(input, ['Autor', 'autor'], ''),
        fromInputOr(input, ['Pag.', 'Páginas'], ''),
        edadErr,
        fromInputOr(input, ['Marca', 'Editorial'], ''),
        input.isbn,
        fromInputOr(input, ['Encuadernación', 'Encuadernacion'], 'Tapa rústica'),
      );
    return {
      'Identificador de URL': fromInputOr(input, ['Identificador de URL', 'Identificador de url', 'url'], ''),
      'Nombre': outNombre,
      'Categorías': catIn,
      'Precio': fromInputOr(input, ['Precio', 'precio'], ''),
      'Precio promocional': fromInputOr(
        input,
        ['Precio promocional', 'Precio Promocional'],
        '',
      ),
      'Peso (kg)': input.peso,
      'Alto (cm)': input.alto,
      'Ancho (cm)': input.ancho,
      'Profundidad (cm)': input.profundidad,
      'Stock': fromInputOr(input, ['Stock', 'stock'], ''),
      'SKU': fromInputOr(input, ['SKU', 'sku'], input.sku),
      'Código de barras': input.isbn,
      'Mostrar en tienda': fromInputOr(
        input,
        ['Mostrar en tienda', 'Mostrar en tienda '],
        DEFAULTS['Mostrar en tienda']!,
      ),
      'Envío sin cargo': fromInputOr(
        input,
        ['Envío sin cargo', 'Envio sin cargo', 'envío sin cargo'],
        DEFAULTS['Envío sin cargo']!,
      ),
      'Descripción': descripcionYCompError,
      'Tags': fromInputOr(
        input,
        ['Tags', 'Tag', 'ETIQUETAS', 'etiquetas'],
        catIn ? `LIBRO ${catIn.toUpperCase()}` : '',
      ),
      'Título para SEO': fromInputOr(input, ['Título para SEO', 'Titulo para SEO', 'Titulo para seo', 'Título Seo'], ''),
      'Descripción para SEO': fromInputOr(
        input,
        ['Descripción para SEO', 'Descripcion para SEO', 'Descripción SEO'],
        '',
      ),
      'Marca': fromInputOr(
        input,
        ['Marca', 'Editorial', 'editorial', 'Editorial/ Marca '],
        '',
      ),
      'Producto Físico': fromInputOr(
        input,
        ['Producto Físico', 'Producto Fisico'],
        DEFAULTS['Producto Físico']!,
      ),
      'MPN (Número de pieza del fabricante)': fromInputOr(
        input,
        ['MPN (Número de pieza del fabricante)', 'MPN', 'Mpn', 'Número de pieza MPN (Número de pieza del fabricante)'],
        input.isbn,
      ),
      'Sexo': fromInputOr(input, ['Sexo', 'sexo', 'Género'], DEFAULTS['Sexo']!),
      'Rango de edad': edadErr,
      'Costo': fromInputOr(input, ['Costo', 'costo', 'COSTO'], ''),
      'Autor': fromInputOr(input, ['Autor', 'autor', 'Autor/Autora'], ''),
      'Pag.': fromInputOr(
        input,
        ['Pag.', 'Pag', 'Páginas', 'Págs'],
        '',
      ),
      'EDAD': edadErr,
      'FOTO TAPA': fromInputOr(
        input,
        ['FOTO TAPA', 'Foto Tapa', 'Foto de tapa / imagen de portada', 'Imagen de portada'],
        '',
      ),
      'Encuadernación': fromInputOr(input, ['Encuadernación', 'Encuadernacion', 'encuad'], ''),
      'Trailer/Video': fromInputOr(input, ['Trailer/Video', 'Trailer / Video', 'Trailer', 'Video', 'Vídeo'], ''),
      'Descripción Compuesta': descripcionYCompError,
      _isbn: input.isbn,
      _imageUrl: fromInputOr(input, ['FOTO TAPA', 'Foto Tapa', 'Foto Tapa/URL'], '') || '',
      _status: 'error',
      _error: 'Producto no encontrado en SBS',
    };
  }

  // Nombre (columna plantilla = no aplica): solo lo que venga en el import; el catálogo alimenta la ficha y la compuesta, no este campo.
  const nombreVtex = (product.productName || '').replace(/^#+\s*/, '').trim();
  const nombreIn   = fromInputOr(input, ['Nombre', 'nombre'], '');
  const nombreBase = (nombreIn || nombreVtex || (input.nombre || '').replace(/^#+\s*/, '')).trim();
  const nombreOut  = nombreIn ? formatNombreVitrina(nombreIn.replace(/^#+/, '')) : '';
  const nombreParaComp = nombreBase;

  const autorV   = extractSpec(product, 'Autor') || extractSpec(product, 'autor') || '';
  const paginasV = extractSpec(product, 'Paginas') || extractSpec(product, 'Pag.') || extractSpec(product, 'pag') || extractSpec(product, 'Páginas') || '';
  const edadV    = extractSpec(product, 'Edad') || extractSpec(product, 'EDAD') || extractSpec(product, 'Rango de edad') || '';
  const encuadV  = extractSpec(product, 'Encuadernacion') || extractSpec(product, 'Encuadernación') || extractSpec(product, 'Formato') || 'Tapa rústica';
  const categoriaV = leafCategory(product);

  const autor   = fromInputOr(input, ['Autor', 'autor', 'Autor/Autora'], autorV);
  const paginas = fromInputOr(input, ['Pag.', 'Pag', 'Páginas', 'Págs.'], paginasV);
  const edadR   =
    fromInputOr(
      input,
      [
        'Rango de edad',
        'EDAD',
        'Edad',
        'Rango De Edad',
        'Rango  de  edad (Aproximado)',
        'Rango de Edad (Desde–Hasta) (Desde)',
      ],
      edadV,
    ) || 'Adultos';
  const encuad  = fromInputOr(input, ['Encuadernación', 'Encuadernacion', 'Ficha técnica', 'Ficha Tecnica'], encuadV);
  const brand   = fromInputOr(input, ['Marca', 'Editorial', 'Editorial.'], product.brand ?? '');

  // Categorías (no aplica): solo import, sin rellenar con catálogo
  const categoriaM   = fromInputOr(input, ['Categorías', 'Categorias', 'Categoria', 'Categoría'], '');

  const descCorta = fromInputOr(
    input,
    ['Descripción', 'Descripcion', 'Descripción.'],
    product.description ?? '',
  );
  const categoriaSeo = categoriaM || categoriaV || 'Adultos';
  const tagsM = fromInputOr(
    input,
    ['Tags', 'Tag', 'Etags', 'etiqueta'],
    (() => {
      if (categoriaM) {
        const p = categoriaM.split('/').filter(Boolean);
        const leaf = p.length ? p[p.length - 1]! : categoriaM;
        return `LIBRO ${leaf.toUpperCase()}`;
      }
      return buildTags(product);
    })(),
  );

  const imageUrlV   = getBestImageUrl(product);
  const imageUrlM = fromInputOr(
    input,
    [
      'FOTO TAPA',
      'Foto Tapa',
      'Foto de la tapa',
      'Imagen de la tapa/ Portada/ imagen/ PDF',
    ],
    imageUrlV,
  );
  // Precio (no aplica en plantilla): solo import
  const precioSolo  = fromInputOr(input, ['Precio', 'Precio.'], '');

  const tSeo = fromInputOr(
    input,
    [
      'Título para SEO',
      'Título (para SEO) (Cómo deberíamos vender: Hasta 20 caracteres)',
      'Titulo para SEO',
    ],
    formatNombreVitrina(nombreBase) || '',
  );

  const descCompPre = fromInputOr(
    input,
    [
      'Descripción Compuesta',
      'Descripcion compuesta',
      'Descripcion Compuesta',
    ],
    '',
  );
  const descComp   = descCompPre
    || buildDescripcionCompuesta(
         nombreParaComp,
         descCorta,
         autor,
         paginas,
         edadR,
         brand,
         input.isbn,
         encuad,
       );
  // Tras componer, el texto de la compuesta pasa a ser el de "Descripción" (mismo valor en ambas columnas)
  const descripcionYComp = descComp;

  const dSeo = fromInputOr(
    input,
    ['Descripción para SEO', 'Descripcion para SEO (texto)', 'Descripción para Seo.'],
    `${tSeo}${tagsM}${categoriaSeo}`,
  );

  return {
    'Identificador de URL': fromInputOr(
      input,
      ['Identificador de URL', 'Identificador  de  URL.'],
      '',
    ),
    'Nombre': nombreOut,
    'Categorías': categoriaM,
    'Precio': precioSolo,
    'Precio promocional': fromInputOr(
      input,
      ['Precio promocional', 'Precio Promocional.'],
      '',
    ),
    'Peso (kg)': input.peso,
    'Alto (cm)': input.alto,
    'Ancho (cm)': input.ancho,
    'Profundidad (cm)': input.profundidad,
    'Stock': fromInputOr(input, ['Stock', 'stocks.'], ''),
    'SKU': fromInputOr(
      input,
      ['SKU', 'Codigo  SKU.'],
      input.sku || product.items?.[0]?.itemId || '',
    ),
    'Código de barras': input.isbn,
    'Mostrar en tienda': fromInputOr(
      input,
      ['Mostrar en tienda', 'Mostrar en  tienda (SI)'],
      DEFAULTS['Mostrar en tienda']!,
    ),
    'Envío sin cargo': fromInputOr(
      input,
      ['Envío sin cargo', 'envío.'],
      DEFAULTS['Envío sin cargo']!,
    ),
    'Descripción': descripcionYComp,
    'Tags': tagsM,
    'Título para SEO': tSeo,
    'Descripción para SEO': dSeo,
    'Marca': brand,
    'Producto Físico': fromInputOr(
      input,
      ['Producto Físico', 'Física'],
      DEFAULTS['Producto Físico']!,
    ),
    'MPN (Número de pieza del fabricante)': fromInputOr(
      input,
      ['MPN (Número de pieza del fabricante)'],
      input.isbn,
    ),
    'Sexo': fromInputOr(
      input,
      ['Sexo', 'Sexo.'],
      DEFAULTS['Sexo']!,
    ),
    'Rango de edad': edadR,
    'Costo': fromInputOr(input, ['Costo.'], ''),
    'Autor': autor,
    'Pag.': paginas,
    'EDAD': edadR,
    'FOTO TAPA': imageUrlM,
    'Encuadernación': encuad,
    'Trailer/Video': fromInputOr(
      input,
      [
        'Trailer/Video',
        'Vídeos, trailer o spot',
        'Url del trailer, spot o vedeo',
      ],
      '',
    ),
    'Descripción Compuesta': descripcionYComp,
    _isbn: input.isbn,
    _imageUrl: imageUrlM,
    _status: 'ok',
  };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function leafCategory(product: VtexProduct): string {
  const cats = product.categories ?? [];
  if (!cats.length) return '';
  // VTEX devuelve paths como "/Ficcion y temas afines/Adultos/"
  const last = cats[cats.length - 1] ?? '';
  const parts = last.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function buildTags(product: VtexProduct): string {
  const cat = leafCategory(product).toUpperCase();
  return cat ? `LIBRO ${cat}` : 'LIBRO';
}

// Arma la descripción compuesta según el patrón exacto de Settings.csv
function buildDescripcionCompuesta(
  nombre: string,
  desc: string,
  autor: string,
  paginas: string,
  edad: string,
  editorial: string,
  isbn: string,
  encuad: string,
): string {
  const descLimpia = stripHtml(desc).trim();
  let out = `#${nombre}  <br>  <br>  DESCRIPCION  <br><br>${descLimpia}`;
  if (autor)     out += `  <br><br>AUTOR/A ${autor}`;
  if (paginas)   out += `  <br><br>CANTIDAD DE PAGINAS ${paginas}`;
  if (edad)      out += `  <br>  <br>EDAD SUGERIDA ${edad}`;
  if (editorial) out += `  <br><br>EDITORIAL ${editorial}`;
  out +=          `  <br><br>ISBN ${isbn}`;
  if (encuad)    out += `  <br><br>FICHA TECNICA: ${encuad}`;
  return out;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────
// EXPORT CSV — FORMATO HORIZONTAL
// header en fila 1, datos en filas 2..N
// ─────────────────────────────────────────────

export function rowsToCsv(rows: OutputRow[]): string {
  const data = rows.map(row => {
    const obj: Record<string, string> = {};
    OUTPUT_COLUMNS.forEach(col => {
      obj[col] = row[col] ?? '';
    });
    return obj;
  });
  return Papa.unparse(data, { columns: OUTPUT_COLUMNS as string[] });
}
