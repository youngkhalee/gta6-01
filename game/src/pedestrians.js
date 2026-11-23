// Pedestrians: sidewalk walkers who chat, stroll, flee gunfire and dive away from fast cars.
import { PED, PED_NAMES } from './config.js';
import { angleTowards, clamp, distanceBetween, lerpAngle } from './random.js';
import { isOnSidewalk, resolveBuildingCollision } from './city.js';

export function spawnPedestrians(city, rng) {
  const peds = [];
  let tries = 0;
  while (peds.length < PED.count && tries < 600) {
    tries += 1;
    const x = rng.range(140, 2960);
    const y = rng.range(120, 2480);
    if (!isOnSidewalk(x, y)) continue;
    peds.push(createPedestrian(x, y, rng));
  }
  while (peds.length < PED.count) {
    peds.push(createPedestrian(320 + peds.length * 37, 320 + peds.length * 53, rng));
  }
  void city;
  return peds;
}

export function createPedestrian(x, y, rng) {
  return {
    x, y,
    angle: rng.range(0, Math.PI * 2),
    targetAngle: 0,
    speed: PED.walkSpeed * rng.range(0.7, 1.2),
    health: PED.health,
    alive: true,
    fleeTimer: 0,
    wanderTimer: rng.range(0.5, 3),
    walkPhase: rng.range(0, 6),
    shirt: rng.pick(['#ff6b81', '#feca57', '#48dbfb', '#1dd1a1', '#f368e0', '#ff9f43', '#c8d6e5', '#54a0ff']),
    skin: rng.pick(['#f1c27d', '#e0ac69', '#8d5524', '#ffdbac', '#a0663a']),
    name: rng.pick(PED_NAMES),
    downTimer: 0,
  };
}

export function scarePedestriansNear(state, x, y, radius) {
  for (const ped of state.peds) {
    if (!ped.alive) continue;
    if (distanceBetween(x, y, ped.x, ped.y) < radius) {
      ped.fleeTimer = Math.max(ped.fleeTimer, 2.6);
      ped.fleeFromX = x;
      ped.fleeFromY = y;
    }
  }
}

export function updatePedestrian(ped, state, dt, rng) {
  if (!ped.alive) {
    ped.downTimer += dt;
    return;
  }
  ped.walkPhase += dt * (ped.fleeTimer > 0 ? 13 : 7);

  let threatX = null;
  let threatY = null;
  if (ped.fleeTimer > 0 && ped.fleeFromX !== undefined) {
    threatX = ped.fleeFromX;
    threatY = ped.fleeFromY;
    ped.fleeTimer -= dt;
  }
  for (const car of state.cars) {
    if (Math.abs(car.speed) > 120 && distanceBetween(ped.x, ped.y, car.x, car.y) < 74) {
      threatX = car.x;
      threatY = car.y;
    }
  }
  if (state.player.car && Math.abs(state.player.car.speed) > 120
    && distanceBetween(ped.x, ped.y, state.player.x, state.player.y) < 74) {
    threatX = state.player.x;
    threatY = state.player.y;
  }

  if (threatX !== null) {
    const away = angleTowards(threatX, threatY, ped.x, ped.y);
    ped.targetAngle = away;
    ped.angle = lerpAngle(ped.angle, away, Math.min(1, 9 * dt));
    ped.x += Math.cos(ped.angle) * PED.fleeSpeed * dt;
    ped.y += Math.sin(ped.angle) * PED.fleeSpeed * dt;
  } else {
    ped.wanderTimer -= dt;
    if (ped.wanderTimer <= 0) {
      ped.wanderTimer = rng.range(1.2, 4);
      ped.targetAngle = ped.angle + rng.range(-1.1, 1.1);
      if (!isOnSidewalk(ped.x + Math.cos(ped.targetAngle) * 60, ped.y + Math.sin(ped.targetAngle) * 60)) {
        ped.targetAngle += Math.PI;
      }
    }
    ped.angle = lerpAngle(ped.angle, ped.targetAngle, Math.min(1, 3.5 * dt));
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
  }
  const fixed = resolveBuildingCollision(state.city, ped.x, ped.y, 11);
  ped.x = fixed.x;
  ped.y = fixed.y;
  ped.x = clamp(ped.x, 30, 3130);
  ped.y = clamp(ped.y, 30, 2570);
}

export function damagePedestrian(state, ped, amount, cause) {
  if (!ped.alive) return false;
  ped.health -= amount;
  ped.fleeTimer = 3;
  ped.fleeFromX = state.player.x;
  ped.fleeFromY = state.player.y;
  if (ped.health <= 0) {
    ped.alive = false;
    ped.downTimer = 0;
    return true;
  }
  void cause;
  return false;
}
