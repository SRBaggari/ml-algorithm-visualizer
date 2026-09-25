// Small seeded pseudo-random generator (mulberry32) so demos are reproducible.
export function createRng(seed = 42) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Approximately normal sample (Box-Muller transform).
export function gaussian(rng, mean = 0, sd = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Fisher-Yates shuffle that returns a new array.
export function shuffle(array, rng) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

export function round(value, digits = 1) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
