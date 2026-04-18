const LS_KEY = 'faro-azul-demo-v1';

type DemoStore = { start: string | null; runs: number; exports: number };

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO === 'true' || import.meta.env.VITE_DEMO === '1';
}

const MAX_ROWS = 3;
const MAX_STARTS = 2;
const MAX_EXPORTS = 2;

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function def(): DemoStore {
  return { start: null, runs: 0, exports: 0 };
}

function read(): DemoStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return def();
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (p && (typeof p.runs === 'number' || typeof p.exports === 'number' || p.start != null)) {
      return {
        start: typeof p.start === 'string' ? p.start : null,
        runs: typeof p.runs === 'number' ? p.runs : 0,
        exports: typeof p.exports === 'number' ? p.exports : 0,
      };
    }
  } catch {
    /* — */
  }
  return def();
}

function write(s: DemoStore) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* — */
  }
}

function dayLocked(s: DemoStore): boolean {
  if (s.start == null) return false;
  return todayLocal() !== s.start;
}

function touchStart(s: DemoStore) {
  if (s.start == null) s.start = todayLocal();
}

export function recordDemoFileSeen(): void {
  if (!isDemoMode()) return;
  const s = read();
  if (s.start != null) return;
  s.start = todayLocal();
  write(s);
}

export function canStartDemoScrape(): boolean {
  if (!isDemoMode()) return true;
  const s = read();
  if (dayLocked(s)) return false;
  return s.runs < MAX_STARTS;
}

export function canDemoExport(): boolean {
  if (!isDemoMode()) return true;
  const s = read();
  if (dayLocked(s)) return false;
  return s.exports < MAX_EXPORTS;
}

export function recordDemoScrapeStart(): void {
  if (!isDemoMode()) return;
  const s = read();
  if (dayLocked(s)) return;
  if (s.runs >= MAX_STARTS) return;
  touchStart(s);
  if (todayLocal() !== s.start) return;
  s.runs += 1;
  write(s);
}

export function recordDemoExport(): void {
  if (!isDemoMode()) return;
  const s = read();
  if (dayLocked(s)) return;
  if (s.exports >= MAX_EXPORTS) return;
  touchStart(s);
  if (todayLocal() !== s.start) return;
  s.exports += 1;
  write(s);
}

export function capInputsForDemo<T>(rows: T[]): T[] {
  if (!isDemoMode() || rows.length <= MAX_ROWS) return rows;
  return rows.slice(0, MAX_ROWS);
}
