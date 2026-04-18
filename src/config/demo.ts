/**
 * Modo demostración: activar en build o entorno con VITE_DEMO=true
 * En producción, no definir la variable o VITE_DEMO=false.
 */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO === 'true' || import.meta.env.VITE_DEMO === '1';
}

export const DEMO_MAX_RECORDS = 10;
/** Máx. arranques de scraping por día en demo (cada “Iniciar scraping” cuenta 1). */
export const DEMO_MAX_INTENTOS_POR_DIA = 2;
const DEMO_MAX_RUNS_PER_DAY = DEMO_MAX_INTENTOS_POR_DIA;
const LS_KEY = 'faro-azul-demo-usage';

type DemoStore = { day: string; runs: number };

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readStore(): DemoStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { day: todayLocal(), runs: 0 };
    const p = JSON.parse(raw) as DemoStore;
    if (typeof p.day === 'string' && typeof p.runs === 'number') return p;
  } catch {
    /* — */
  }
  return { day: todayLocal(), runs: 0 };
}

function writeStore(s: DemoStore) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* — */
  }
}

function normalizedStore(): DemoStore {
  const s = readStore();
  const t = todayLocal();
  if (s.day !== t) return { day: t, runs: 0 };
  return s;
}

/** Puede arrancar un nuevo scraping hoy (suma 1 al confirmar con recordDemoScrapeStart). */
export function canStartDemoScrape(): boolean {
  if (!isDemoMode()) return true;
  return normalizedStore().runs < DEMO_MAX_RUNS_PER_DAY;
}

export function getDemoRunsToday(): { used: number; remaining: number; max: number } {
  const s = normalizedStore();
  return {
    used: s.runs,
    max: DEMO_MAX_RUNS_PER_DAY,
    remaining: Math.max(0, DEMO_MAX_RUNS_PER_DAY - s.runs),
  };
}

/** Llamar una vez, justo antes de run() en modo demo, si canStart es true. */
export function recordDemoScrapeStart(): void {
  if (!isDemoMode()) return;
  const s = normalizedStore();
  s.runs += 1;
  s.day = todayLocal();
  writeStore(s);
}

export function capInputsForDemo<T>(rows: T[]): T[] {
  if (!isDemoMode() || rows.length <= DEMO_MAX_RECORDS) return rows;
  return rows.slice(0, DEMO_MAX_RECORDS);
}

export function getTruncationCount(total: number): number {
  if (!isDemoMode() || total <= DEMO_MAX_RECORDS) return 0;
  return total - DEMO_MAX_RECORDS;
}
