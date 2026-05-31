// Mulberry32 – fast, deterministic seeded PRNG
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function dateToSeed(dateStr: string): number {
  return dateStr
    .split('-')
    .reduce((acc, part) => acc * 100 + parseInt(part, 10), 0);
}

export function getDailyNumber(dateStr?: string): number {
  const str = dateStr ?? getTodayString();
  const seed = dateToSeed(str);
  const rng = mulberry32(seed);
  return Math.floor(rng() * 1000) + 1;
}

export function getYesterdayNumber(): number {
  return getDailyNumber(getDateString(-1));
}