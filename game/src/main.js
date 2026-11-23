// Neon Harbor: boot, game state, the fixed-step loop, player control, combat and camera.
// Vale Cruz returns to a sun-soaked coastal city and gets pulled into the marina turf war.
import { DAY_LENGTH, PLAYER, STEP, VIEW, WEAPON, WORLD } from './config.js';
import { clamp, createRandom, distanceBetween } from './random.js';
import { generateCity, resolveBuildingCollision } from './city.js';
import { createCar, driveCarPhysics, carSpeedRatio, spawnParkedCars, spawnTrafficCars, updateTrafficCar } from './vehicles.js';
import { createPedestrian, damagePedestrian, scarePedestriansNear, spawnPedestrians, updatePedestrian } from './pedestrians.js';
import { clearWanted, createWantedState, reportCrime, updateOfficer, updatePoliceCar, updateWanted } from './police.js';
import { createMissionState, createSideJob, currentStep, startMissionDialogue, updateMissionStep, updateSideJob } from './missions.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { hasSave, loadGame, saveGame } from './save.js';
import { drawDialogue, drawEndScreen, drawHUD, drawMessage, drawPauseScreen, drawTitleScreen, drawWorld } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '7', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function createState() {
  const rng = createRandom(seed * 7919 + 13);
  const city = generateCity(rng);
  const cars = spawnParkedCars(city, rng).concat(spawnTrafficCars(rng));
  const state = {
    rng,
    city,
    cars,
    peds: spawnPedestrians(city, rng),
    policeCars: [],
    officers: [],
    hostiles: [],
    hostilesSpawned: false,
    bullets: [],
    enemyShots: [],
    particles: [],
    player: {
      x: 700, y: 668, aimAngle: 0, walkPhase: 0,
      health: PLAYER.health, armor: PLAYER.armor, car: null,
    },
    wanted: createWantedState(),
    missions: createMissionState(),
    cash: 120,
    ammo: WEAPON.magSize,
    reserve: WEAPON.reserveStart,
    reloading: 0,
    fireTimer: 0,
    muzzle: 0,
    clock: 0.3,
    clockText: '09:12',
    night: 0,
    time: 0,
    screen: shotName ? 'play' : 'title',
    message: '',
    messageTimer: 0,
    nearCar: null,
    missionCar: null,
    sideJob: null,
    sideJobTimer: 6,
    stats: { missionsDone: 0, sideDone: 0, carsStolen: 0, faresDone: 0, packagesDone: 0 },
    shake: 0,
    endKind: null,
    endTimer: 0,
    pendingBust: false,
    audio: createAudio(),
    save: null,
  };
  state.save = () => saveGame(state);
  return state;
}

const state = createState();
const input = shotName ? null : createInput(canvas);

function spawnParticles(x, y, color, count, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.9);
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.5 + Math.random() * 0.8), maxLife: life, color, size: size * (0.6 + Math.random() * 0.8),
    });
  }
}

function nearestEnterableCar() {
  let best = null;
  let bestDist = 52;
  for (const car of state.cars) {
    const d = distanceBetween(state.player.x, state.player.y, car.x, car.y);
    if (d < bestDist) { best = car; bestDist = d; }
  }
  return best;
}

function enterCar(car) {
  const wasParked = car.kind === 'parked';
  state.player.car = car;
  car.kind = 'player';
  state.audio.door();
  if (wasParked) {
    state.stats.carsStolen += 1;
    reportCrime(state, 0.55, car.x, car.y);
    state.message = 'Vehicle stolen!';
    state.messageTimer = 1.8;
    const step = currentStep(state);
    if (step && step.type === 'steal') {
      if (!step.marked || state.missionCar === car) {
        import('./missions.js').then((m) => m.completeStep(state));
      }
    }
  }
}

function exitCar() {
  const car = state.player.car;
  if (!car) return;
  car.kind = Math.abs(car.speed) < 5 ? 'parked' : 'traffic';
  car.speed = 0;
  state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
  state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
  const fixed = resolveBuildingCollision(state.city, state.player.x, state.player.y, PLAYER.radius);
  state.player.x = fixed.x;
  state.player.y = fixed.y;
  state.player.car = null;
  state.audio.door();
  state.audio.setEngine(false, 0);
}

function ensureMissionEntities() {
  const step = currentStep(state);
  if (!step) return;
  if (step.type === 'shootout') {
    if (!state.hostilesSpawned) {
      state.hostilesSpawned = true;
      for (let i = 0; i < step.count; i += 1) {
        state.hostiles.push({
          x: step.x + (i - 1) * 70, y: step.y + (i % 2) * 60 - 30,
          angle: Math.PI, health: 45, alive: true, walkPhase: 0, shootTimer: 1 + i * 0.6,
        });
      }
    }
  } else if (state.hostilesSpawned && step.type !== 'shootout') {
    state.hostiles = [];
    state.hostilesSpawned = false;
  }
  if (step.type === 'steal' && step.marked && !state.missionCar) {
    const car = createCar(1960, 330, Math.PI / 2, '#ffd11a', 'parked');
    state.cars.push(car);
    state.missionCar = car;
  }
  if (step.type !== 'steal' && state.missionCar && state.player.car !== state.missionCar) {
    state.cars = state.cars.filter((c) => c !== state.missionCar);
    state.missionCar = null;
  }
}

function playerShoot() {
  if (state.reloading > 0) return;
  if (state.ammo <= 0) {
    state.audio.dryFire();
    startReload();
    return;
  }
  state.ammo -= 1;
  state.fireTimer = WEAPON.cooldown;
  state.muzzle = 0.06;
  const p = state.player;
  const angle = p.aimAngle + (Math.random() - 0.5) * 2 * WEAPON.spread;
  state.bullets.push({ x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22, angle, life: WEAPON.range / 720, fromEnemy: false });
  state.audio.shoot();
  scarePedestriansNear(state, p.x, p.y, 260);
  reportCrime(state, 0.22, p.x, p.y);
  if (state.ammo === 0) startReload();
}

function startReload() {
  if (state.reloading > 0 || state.reserve <= 0) return;
  state.reloading = WEAPON.reloadTime;
  state.audio.reload();
}

function finishReload() {
  const need = WEAPON.magSize - state.ammo;
  const take = Math.min(need, state.reserve);
  state.ammo += take;
  state.reserve -= take;
}

function damagePlayer(amount) {
  const p = state.player;
  if (state.endKind) return;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, amount * 0.65);
    p.armor -= absorbed;
    amount -= absorbed;
  }
  p.health -= amount;
  spawnParticles(p.car ? p.car.x : p.x, p.car ? p.car.y : p.y, '#e74c3c', 4, 90, 0.4, 3);
  if (p.health <= 0) {
    state.endKind = 'wasted';
    state.endTimer = 3.2;
    state.audio.busted();
  }
}

function respawnAt(kind) {
  const spot = kind === 'busted' ? state.city.landmarks.policeStation : state.city.landmarks.hospital;
  const fee = kind === 'busted' ? 120 : 150;
  state.cash = Math.max(0, state.cash - fee);
  if (state.player.car) {
    state.cars = state.cars.filter((c) => c !== state.player.car);
    state.player.car = null;
    state.audio.setEngine(false, 0);
  }
  clearWanted(state);
  state.player.x = spot.x;
  state.player.y = spot.y + 40;
  state.player.health = PLAYER.health;
  state.player.armor = 0;
  state.endKind = null;
  state.screen = 'play';
  state.message = kind === 'busted' ? 'Released. -$' + fee + ' fine.' : 'Patched up. -$' + fee + ' clinic bill.';
  state.messageTimer = 3;
  state.save();
}

function updatePlayer(dt) {
  const p = state.player;
  if (p.car) {
    driveCarPhysics(p.car, input, dt);
    p.x = p.car.x;
    p.y = p.car.y;
    const fixed = resolveBuildingCollision(state.city, p.car.x, p.car.y, 24);
    if (Math.abs(fixed.x - p.car.x) > 0.5 || Math.abs(fixed.y - p.car.y) > 0.5) {
      const impact = Math.abs(p.car.speed);
      if (impact > 130) {
        p.car.health -= impact * 0.06;
        damagePlayer(impact * 0.018);
        state.shake = Math.min(9, impact * 0.03);
        state.audio.crash(impact * 0.05);
        spawnParticles(p.car.x, p.car.y, '#f5d76e', 8, 130, 0.4, 3);
      }
      p.car.x = fixed.x;
      p.car.y = fixed.y;
      p.car.speed *= -0.25;
      p.x = p.car.x;
      p.y = p.car.y;
    }
    p.car.x = clamp(p.car.x, 40, WORLD.width - 40);
    p.car.y = clamp(p.car.y, 40, WORLD.height - 40);
    p.x = p.car.x;
    p.y = p.car.y;
    state.audio.setEngine(true, carSpeedRatio(p.car));
    if (input.wasPressed('KeyE')) exitCar();
    checkRunOver();
    return;
  }
  state.audio.setEngine(false, 0);
  const move = input.moveVector();
  const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  if (move.active) {
    p.walkPhase += dt * (sprint ? 13 : 9);
    const nx = p.x + move.x * speed * dt;
    const ny = p.y + move.y * speed * dt;
    const fixed = resolveBuildingCollision(state.city, nx, ny, PLAYER.radius);
    p.x = fixed.x;
    p.y = fixed.y;
  }
  p.aimAngle = Math.atan2(input.mouseY - VIEW.height / 2, input.mouseX - VIEW.width / 2);
  state.nearCar = nearestEnterableCar();
  if (input.wasPressed('KeyE') && state.nearCar) enterCar(state.nearCar);
  state.fireTimer -= dt;
  if ((input.mouseDown || input.isDown('KeyF')) && state.fireTimer <= 0) playerShoot();
  if (input.wasPressed('KeyR')) startReload();
}

function checkRunOver() {
  const car = state.player.car;
  if (!car || Math.abs(car.speed) < 55) return;
  for (const ped of state.peds) {
    if (!ped.alive) continue;
    if (distanceBetween(car.x, car.y, ped.x, ped.y) < 26) {
      if (damagePedestrian(state, ped, 999, 'car')) {
        reportCrime(state, 0.85, ped.x, ped.y);
        state.stats.sideDone = state.stats.sideDone;
      }
      spawnParticles(ped.x, ped.y, '#c0392b', 10, 120, 0.5, 3.4);
      state.audio.hit();
      state.shake = Math.max(state.shake, 4);
    }
  }
}

function updateBullets(dt) {
  const speed = 720;
  for (const b of state.bullets) {
    b.x += Math.cos(b.angle) * speed * dt;
    b.y += Math.sin(b.angle) * speed * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    for (const ped of state.peds) {
      if (ped.alive && distanceBetween(b.x, b.y, ped.x, ped.y) < 13) {
        b.life = 0;
        if (damagePedestrian(state, ped, WEAPON.damage, 'shot')) reportCrime(state, 0.8, ped.x, ped.y);
        spawnParticles(ped.x, ped.y, '#c0392b', 6, 110, 0.4, 3);
        state.audio.hit();
        break;
      }
    }
    if (b.life <= 0) continue;
    for (const h of state.hostiles) {
      if (h.alive && distanceBetween(b.x, b.y, h.x, h.y) < 14) {
        b.life = 0;
        h.health -= WEAPON.damage;
        spawnParticles(h.x, h.y, '#c0392b', 6, 110, 0.4, 3);
        if (h.health <= 0) { h.alive = false; state.cash += 25; }
        break;
      }
    }
    if (b.life <= 0) continue;
    for (const officer of state.officers) {
      if (officer.alive && distanceBetween(b.x, b.y, officer.x, officer.y) < 13) {
        b.life = 0;
        officer.health -= WEAPON.damage;
        if (officer.health <= 0) { officer.alive = false; reportCrime(state, 0.9, officer.x, officer.y); }
        break;
      }
    }
    if (b.life <= 0) continue;
    for (const car of state.cars.concat(state.policeCars)) {
      if (car !== state.player.car && distanceBetween(b.x, b.y, car.x, car.y) < 24) {
        b.life = 0;
        car.health -= WEAPON.damage * 0.6;
        spawnParticles(b.x, b.y, '#f5d76e', 4, 120, 0.3, 2.4);
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);

  for (const shot of state.enemyShots) {
    state.bullets.push({ x: shot.x, y: shot.y, angle: shot.angle + (Math.random() - 0.5) * 0.14, life: 0.55, fromEnemy: true, enemy: true });
    state.audio.shoot();
  }
  state.enemyShots = [];
  for (const b of state.bullets) {
    if (!b.enemy) continue;
    const target = state.player.car || state.player;
    if (distanceBetween(b.x, b.y, target.x, target.y) < (state.player.car ? 26 : 14)) {
      b.life = 0;
      if (Math.random() < 0.75) damagePlayer(7 + Math.random() * 6);
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

function updateHostiles(dt) {
  const p = state.player;
  for (const h of state.hostiles) {
    if (!h.alive) continue;
    h.walkPhase += dt * 8;
    const d = distanceBetween(h.x, h.y, p.x, p.y);
    h.angle = Math.atan2(p.y - h.y, p.x - h.x);
    if (d > 130) {
      h.x += Math.cos(h.angle) * 74 * dt;
      h.y += Math.sin(h.angle) * 74 * dt;
    }
    h.shootTimer -= dt;
    if (d < 300 && h.shootTimer <= 0) {
      h.shootTimer = 1 + Math.random() * 0.8;
      state.enemyShots.push({ x: h.x, y: h.y, angle: h.angle });
    }
  }
}

function updateWorld(dt) {
  state.time += dt;
  state.clock = (state.clock + dt / DAY_LENGTH) % 1;
  const hour = 6 + state.clock * 24;
  const hh = Math.floor(hour) % 24;
  const mm = Math.floor((hour % 1) * 60);
  state.clockText = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  const sun = Math.sin(state.clock * Math.PI);
  state.night = clamp(1 - sun * 1.6, 0, 1);
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.muzzle > 0) state.muzzle -= dt;
  if (state.reloading > 0) {
    state.reloading -= dt;
    if (state.reloading <= 0) finishReload();
  }
  state.shake = Math.max(0, state.shake - dt * 22);

  for (const car of state.cars) updateTrafficCar(car, state, dt, state.rng);
  for (const ped of state.peds) updatePedestrian(ped, state, dt, state.rng);
  for (let i = state.peds.length - 1; i >= 0; i -= 1) {
    if (!state.peds[i].alive && state.peds[i].downTimer > 25) {
      state.peds[i] = createPedestrian(300 + Math.random() * 2600, 200 + Math.random() * 2200, state.rng);
    }
  }
  updateWanted(state, dt);
  for (const cop of state.policeCars) updatePoliceCar(cop, state, dt);
  for (const officer of state.officers) updateOfficer(officer, state, dt);
  state.audio.setSiren(state.policeCars.length > 0 && state.screen === 'play');

  updateHostiles(dt);
  updateBullets(dt);
  for (const fx of state.particles) {
    fx.life -= dt;
    fx.x += fx.vx * dt;
    fx.y += fx.vy * dt;
    fx.vx *= 0.92;
    fx.vy *= 0.92;
  }
  state.particles = state.particles.filter((fx) => fx.life > 0);

  ensureMissionEntities();
  if (state.missions.dialogue.length === 0) {
    updateMissionStep(state, dt);
    updateSideJob(state, dt);
    if (!state.sideJob) {
      state.sideJobTimer -= dt;
      if (state.sideJobTimer <= 0) {
        state.sideJobTimer = 14;
        state.sideJob = createSideJob(state.rng, state.player);
        state.message = 'New side job available - follow the orange $ marker';
        state.messageTimer = 2.6;
      }
    }
  }
  if (state.pendingBust) {
    state.pendingBust = false;
    state.endKind = 'busted';
    state.endTimer = 3.2;
    state.audio.busted();
  }
  state.audio.updateMusic(dt, state.screen === 'play');
}

function drawFrame() {
  const p = state.player;
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const camX = clamp(p.x - VIEW.width / 2 + shakeX, 0, WORLD.width - VIEW.width);
  const camY = clamp(p.y - VIEW.height / 2 + shakeY, 0, WORLD.height - VIEW.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#10131c';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.save();
  ctx.translate(-camX, -camY);
  drawWorld(ctx, state, { x: camX, y: camY });
  ctx.restore();
  if (state.screen === 'title') {
    drawTitleScreen(ctx, state, hasSave());
    return;
  }
  drawHUD(ctx, state);
  drawMessage(ctx, state);
  drawDialogue(ctx, state);
  if (state.screen === 'paused') drawPauseScreen(ctx);
  if (state.endKind) drawEndScreen(ctx, state, state.endKind);
}

function startNewGame() {
  state.screen = 'play';
  state.missions.dialogue = createMissionState().dialogue;
  statusEl.textContent = 'Neon Harbor. Mission: First Wheels.';
}

function continueGame() {
  const data = loadGame();
  if (data) {
    state.cash = data.cash;
    state.player.health = data.health;
    state.player.armor = data.armor;
    state.missions.index = clamp(data.missionIndex, 0, 5);
    state.player.x = data.playerX;
    state.player.y = data.playerY;
    state.clock = data.clock || 0.3;
    state.stats.faresDone = data.faresDone || 0;
    state.stats.packagesDone = data.packagesDone || 0;
    state.stats.carsStolen = data.carsStolen || 0;
    startMissionDialogue(state);
  }
  state.screen = 'play';
}

function handleMenuKeys() {
  if (state.screen === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      state.audio.unlock();
      if (hasSave() && !input.wasPressed('KeyN')) continueGame();
      else startNewGame();
    }
    if (input.wasPressed('KeyN')) { state.audio.unlock(); startNewGame(); }
    return;
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    state.screen = state.screen === 'paused' ? 'play' : 'paused';
  }
  if (state.screen === 'play' && input.wasPressed('KeyM')) {
    state.save();
    state.message = 'Game saved.';
    state.messageTimer = 2;
  }
  if (state.missions.dialogue.length > 0 && state.screen === 'play') {
    if (input.wasPressed('Enter') || input.mouseClicked) state.missions.dialogue.shift();
  }
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    handleMenuKeys();
    if (state.endKind) {
      state.endTimer -= 1 / 60;
      if (state.endTimer <= 0) respawnAt(state.endKind);
    } else if (state.screen === 'play') {
      while (accumulator >= STEP) {
        if (state.missions.dialogue.length === 0) updatePlayer(STEP);
        updateWorld(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      state.time += 1 / 60;
    }
    drawFrame();
    input.endFrame();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.screen === 'play') state.screen = 'paused';
  });
  canvas.addEventListener('mousedown', () => state.audio.unlock());
  window.addEventListener('keydown', () => state.audio.unlock(), { once: true });
  statusEl.textContent = 'Neon Harbor. Press Enter to start.';
  requestAnimationFrame(frame);
}

function runShot() {
  stageShot(state, shotName);
  state.time = 2;
  const camP = state.player;
  void camP;
  let painted = 0;
  function paint() {
    drawFrame();
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shotName) runShot();
else runGame();
