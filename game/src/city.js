// City generation for Neon Harbor: road grid, city blocks, buildings, beach, palms and props.
// Also answers collision and road-network queries for every other system.
import { BEACH, BUILDING_NAMES, PALETTE, ROADS, WORLD } from './config.js';
import { clamp } from './random.js';

const ROOF_COLORS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];

export function roadCentersX() {
  const list = [];
  for (let x = ROADS.firstX; x < BEACH.sandX - 80; x += ROADS.spacingX) list.push(x);
  return list;
}

export function roadCentersY() {
  const list = [];
  for (let y = ROADS.firstY; y < WORLD.height - 60; y += ROADS.spacingY) list.push(y);
  return list;
}

export function isOnVerticalRoad(x) {
  return roadCentersX().some((cx) => Math.abs(x - cx) <= ROADS.width / 2);
}

export function isOnHorizontalRoad(y) {
  return roadCentersY().some((cy) => Math.abs(y - cy) <= ROADS.width / 2);
}

export function isOnRoad(x, y) {
  return isOnVerticalRoad(x) || isOnHorizontalRoad(y);
}

export function isOnSidewalk(x, y) {
  const margin = ROADS.width / 2 + 16;
  const nearV = roadCentersX().some((cx) => Math.abs(x - cx) <= margin && Math.abs(x - cx) > ROADS.width / 2 - 2);
  const nearH = roadCentersY().some((cy) => Math.abs(y - cy) <= margin && Math.abs(y - cy) > ROADS.width / 2 - 2);
  return nearV || nearH;
}

export function isInWater(x) {
  return x >= BEACH.waterX;
}

export function nearestRoadPoint(x, y) {
  let best = { x, y, dist: Infinity };
  for (const cx of roadCentersX()) {
    const d = Math.abs(x - cx);
    if (d < best.dist) best = { x: cx, y, dist: d };
  }
  for (const cy of roadCentersY()) {
    const d = Math.abs(y - cy);
    if (d < best.dist) best = { x, y: cy, dist: d };
  }
  return best;
}

export function generateCity(rng) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const benches = [];
  const xs = roadCentersX();
  const ys = roadCentersY();
  let nameIndex = 0;

  for (let bx = 0; bx < xs.length - 1; bx += 1) {
    for (let by = 0; by < ys.length - 1; by += 1) {
      const blockX = xs[bx] + ROADS.width / 2 + 14;
      const blockY = ys[by] + ROADS.width / 2 + 14;
      const blockW = ROADS.spacingX - ROADS.width - 28;
      const blockH = ROADS.spacingY - ROADS.width - 28;
      const cols = rng.int(1, 2);
      const rows = rng.int(1, 2);
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const w = (blockW / cols) - 16;
          const h = (blockH / rows) - 16;
          if (w < 60 || h < 50) continue;
          const x = blockX + cx * (blockW / cols) + 8;
          const y = blockY + cy * (blockH / rows) + 8;
          const floors = rng.int(2, 9);
          buildings.push({
            x, y, w, h,
            roof: rng.pick(ROOF_COLORS),
            floors,
            name: BUILDING_NAMES[nameIndex % BUILDING_NAMES.length],
            windowsAcross: Math.max(2, Math.floor(w / 26)),
            windowsDown: Math.max(2, Math.floor(h / 24)),
            seed: rng.int(1, 99999),
          });
          nameIndex += 1;
        }
      }
      if (rng.chance(0.7)) {
        palms.push({ x: blockX + rng.range(6, 30), y: blockY + rng.range(6, 30), size: rng.range(13, 20) });
      }
      if (rng.chance(0.5)) {
        benches.push({ x: blockX + blockW / 2, y: blockY + blockH - 10 });
      }
    }
  }

  for (const cx of xs) {
    for (let y = 90; y < WORLD.height - 60; y += 210) lamps.push({ x: cx - ROADS.width / 2 - 8, y });
  }
  for (let y = 120; y < WORLD.height - 40; y += 160) {
    palms.push({ x: BEACH.sandX + rng.range(14, 90), y, size: rng.range(14, 21) });
  }

  const landmarks = {
    hospital: { x: xs[1], y: ys[1] - 90, label: 'Harbor Clinic' },
    policeStation: { x: xs[xs.length - 2], y: ys[ys.length - 2] + 90, label: 'Harbor PD' },
    marina: { x: BEACH.sandX + 40, y: ys[2], label: 'Neon Marina' },
    garage: { x: xs[0] + 70, y: ys[ys.length - 1], label: 'Rico Garage' },
    hotel: { x: xs[2], y: ys[0] - 80, label: 'Coral Hotel' },
  };

  return { buildings, palms, lamps, benches, landmarks };
}

export function buildingAt(city, x, y, pad) {
  const p = pad || 0;
  for (const b of city.buildings) {
    if (x > b.x - p && x < b.x + b.w + p && y > b.y - p && y < b.y + b.h + p) return b;
  }
  return null;
}

export function resolveBuildingCollision(city, x, y, radius) {
  let nx = x;
  let ny = y;
  for (const b of city.buildings) {
    const closestX = clamp(nx, b.x, b.x + b.w);
    const closestY = clamp(ny, b.y, b.y + b.h);
    const dx = nx - closestX;
    const dy = ny - closestY;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        nx = closestX + (dx / d) * radius;
        ny = closestY + (dy / d) * radius;
      } else {
        const left = Math.abs(nx - b.x);
        const right = Math.abs(nx - (b.x + b.w));
        const top = Math.abs(ny - b.y);
        const bottom = Math.abs(ny - (b.y + b.h));
        const min = Math.min(left, right, top, bottom);
        if (min === left) nx = b.x - radius;
        else if (min === right) nx = b.x + b.w + radius;
        else if (min === top) ny = b.y - radius;
        else ny = b.y + b.h + radius;
      }
    }
  }
  return { x: clamp(nx, radius, WORLD.width - radius), y: clamp(ny, radius, WORLD.height - radius) };
}

export function circleHitsBuilding(city, x, y, radius) {
  return buildingAt(city, x, y, radius - 2) !== null;
}
