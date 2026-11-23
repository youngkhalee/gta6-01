// Deterministic seeded random number generator (mulberry32) so every visit builds the same city.

export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) { return min + next() * (max - min); },
    int(min, max) { return Math.floor(min + next() * (max - min + 1)); },
    pick(list) { return list[Math.floor(next() * list.length) % list.length]; },
    chance(p) { return next() < p; },
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function distanceBetween(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTowards(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
