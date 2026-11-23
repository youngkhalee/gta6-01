// Police and the wanted system: crimes raise stars, hiding decays them, cruisers and officers pursue.
import { POLICE } from './config.js';
import { angleTowards, clamp, distanceBetween, lerpAngle } from './random.js';
import { resolveBuildingCollision } from './city.js';
import { createCar } from './vehicles.js';

export function createWantedState() {
  return {
    stars: 0,
    heat: 0,
    seenTimer: 0,
    hiddenTimer: 0,
    bustProgress: 0,
    spawnTimer: 0,
  };
}

export function reportCrime(state, severity, x, y) {
  const w = state.wanted;
  const before = w.stars;
  w.heat += severity;
  while (w.heat >= 1 && w.stars < POLICE.maxStars) {
    w.stars += 1;
    w.heat -= 1;
  }
  if (w.stars > before) {
    w.hiddenTimer = 0;
    state.message = 'Wanted level ' + w.stars + (w.stars >= 3 ? ' - Harbor PD is hunting you!' : '');
    state.messageTimer = 2.6;
    if (state.audio) state.audio.pickup();
  }
  void x;
  void y;
}

export function policeCanSeePlayer(state) {
  const p = state.player;
  for (const cop of state.policeCars) {
    if (distanceBetween(p.x, p.y, cop.x, cop.y) < POLICE.sightRange) return true;
  }
  for (const officer of state.officers) {
    if (officer.alive && distanceBetween(p.x, p.y, officer.x, officer.y) < 240) return true;
  }
  return false;
}

export function updateWanted(state, dt) {
  const w = state.wanted;
  if (w.stars <= 0) {
    w.bustProgress = 0;
    return;
  }
  if (policeCanSeePlayer(state)) {
    w.seenTimer += dt;
    w.hiddenTimer = 0;
  } else {
    w.hiddenTimer += dt;
    w.seenTimer = 0;
    if (w.hiddenTimer > POLICE.decayDelay + w.stars * 2.2) {
      w.stars -= 1;
      w.heat = 0;
      w.hiddenTimer = 0;
      state.message = w.stars === 0 ? 'You lost the cops.' : 'Heat is cooling off...';
      state.messageTimer = 2.2;
    }
  }

  w.spawnTimer -= dt;
  const wantedCars = w.stars >= 4 ? 4 : w.stars;
  if (w.spawnTimer <= 0 && state.policeCars.length < wantedCars) {
    w.spawnTimer = 2.4;
    spawnPoliceCar(state);
  }
  if (state.policeCars.length > wantedCars + 1) {
    state.policeCars.pop();
  }

  updateBustProgress(state, dt);
}

function spawnPoliceCar(state) {
  const p = state.player;
  const angle = Math.random() * Math.PI * 2;
  const dist = 560 + Math.random() * 140;
  let x = clamp(p.x + Math.cos(angle) * dist, 80, 3060);
  let y = clamp(p.y + Math.sin(angle) * dist, 80, 2520);
  const near = state.city ? null : null;
  void near;
  const car = createCar(x, y, angle + Math.PI, '#f5f6fa', 'police');
  car.health = 130;
  state.policeCars.push(car);
  if (state.wanted.stars >= 2 && state.officers.length < state.wanted.stars) {
    state.officers.push({
      x: x + 24, y: y + 18, angle: 0, health: 40, alive: true,
      shootTimer: Math.random() * 1.2, walkPhase: 0, car,
    });
  }
}

export function updatePoliceCar(car, state, dt) {
  const p = state.player;
  const targetX = p.car ? p.car.x : p.x;
  const targetY = p.car ? p.car.y : p.y;
  const dist = distanceBetween(car.x, car.y, targetX, targetY);
  const wanted = angleTowards(car.x, car.y, targetX, targetY);
  car.angle = lerpAngle(car.angle, wanted, Math.min(1, 2.6 * dt));
  const speedTarget = dist > 60 ? POLICE.carSpeed : POLICE.carSpeed * 0.25;
  car.speed += clamp(speedTarget - Math.abs(car.speed), -300 * dt, 200 * dt) * Math.sign(1);
  if (car.speed < 0) car.speed = 0;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveBuildingCollision(state.city, nx, ny, 24);
  if (Math.abs(fixed.x - nx) > 1 || Math.abs(fixed.y - ny) > 1) {
    car.speed *= 0.4;
    car.angle += 0.7 * dt * 3;
  }
  car.x = clamp(fixed.x, 40, 3120);
  car.y = clamp(fixed.y, 40, 2560);
  car.brakeLights = dist < 70;
}

export function updateOfficer(officer, state, dt) {
  if (!officer.alive) return;
  officer.walkPhase += dt * 8;
  const p = state.player;
  const dist = distanceBetween(officer.x, officer.y, p.x, p.y);
  const inCar = p.car !== null;
  if (!inCar && dist > 52) {
    const wanted = angleTowards(officer.x, officer.y, p.x, p.y);
    officer.angle = lerpAngle(officer.angle, wanted, Math.min(1, 7 * dt));
    officer.x += Math.cos(officer.angle) * POLICE.footSpeed * dt;
    officer.y += Math.sin(officer.angle) * POLICE.footSpeed * dt;
    const fixed = resolveBuildingCollision(state.city, officer.x, officer.y, 11);
    officer.x = fixed.x;
    officer.y = fixed.y;
  } else if (!inCar) {
    officer.angle = angleTowards(officer.x, officer.y, p.x, p.y);
  } else if (officer.car && officer.car.health > 0) {
    officer.x = officer.car.x + 24;
    officer.y = officer.car.y + 18;
  }
  officer.shootTimer -= dt;
  if (dist < 300 && dist > 44 && state.wanted.stars >= 2 && officer.shootTimer <= 0) {
    officer.shootTimer = 0.9 + Math.random() * 0.7;
    state.enemyShots.push({ x: officer.x, y: officer.y, angle: angleTowards(officer.x, officer.y, p.x, p.y) });
  }
}

function updateBustProgress(state, dt) {
  const w = state.wanted;
  const p = state.player;
  if (p.car) {
    w.bustProgress = Math.max(0, w.bustProgress - dt * 1.4);
    return;
  }
  let nearOfficer = false;
  for (const officer of state.officers) {
    if (officer.alive && distanceBetween(p.x, p.y, officer.x, officer.y) < POLICE.bustRadius) nearOfficer = true;
  }
  for (const cop of state.policeCars) {
    if (distanceBetween(p.x, p.y, cop.x, cop.y) < POLICE.bustRadius + 12 && Math.abs(cop.speed) < 40) nearOfficer = true;
  }
  if (nearOfficer && w.stars > 0) {
    w.bustProgress += dt / POLICE.bustTime;
    if (w.bustProgress >= 1) {
      state.pendingBust = true;
      w.bustProgress = 0;
    }
  } else {
    w.bustProgress = Math.max(0, w.bustProgress - dt * 1.8);
  }
}

export function clearWanted(state) {
  state.wanted.stars = 0;
  state.wanted.heat = 0;
  state.wanted.hiddenTimer = 0;
  state.wanted.bustProgress = 0;
  state.policeCars.length = 0;
  state.officers.length = 0;
}
