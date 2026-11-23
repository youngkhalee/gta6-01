// Vehicles: car factory, parked cars, road-following traffic AI and player driving physics.
import { CAR, CAR_COLORS, ROADS } from './config.js';
import { angleTowards, clamp, distanceBetween, lerpAngle } from './random.js';
import { circleHitsBuilding, isOnRoad, roadCentersX, roadCentersY } from './city.js';

let nextCarId = 1;

export function createCar(x, y, angle, color, kind) {
  return {
    id: nextCarId++,
    x, y, angle,
    speed: 0,
    width: CAR.width,
    height: CAR.height,
    color,
    kind: kind || 'traffic',
    health: 100,
    driver: null,
    steer: 0,
    honkTimer: 0,
    brakeLights: false,
    stuckTimer: 0,
    reverseTimer: 0,
    flashPhase: Math.random() * 6,
  };
}

export function spawnParkedCars(city, rng) {
  const cars = [];
  const xs = roadCentersX();
  const ys = roadCentersY();
  let tries = 0;
  while (cars.length < CAR.parkedCount && tries < 400) {
    tries += 1;
    const vertical = rng.chance(0.5);
    if (vertical) {
      const cx = rng.pick(xs);
      const y = rng.range(120, 2440);
      const side = rng.chance(0.5) ? -1 : 1;
      const x = cx + side * (ROADS.width / 2 + 14);
      if (circleHitsBuilding(city, x, y, 20)) continue;
      cars.push(createCar(x, y, side > 0 ? Math.PI / 2 : -Math.PI / 2, rng.pick(CAR_COLORS), 'parked'));
    } else {
      const cy = rng.pick(ys);
      const x = rng.range(120, 2900);
      const side = rng.chance(0.5) ? -1 : 1;
      const y = cy + side * (ROADS.width / 2 + 14);
      if (circleHitsBuilding(city, x, y, 20)) continue;
      cars.push(createCar(x, y, side > 0 ? 0 : Math.PI, rng.pick(CAR_COLORS), 'parked'));
    }
  }
  return cars;
}

export function spawnTrafficCars(rng) {
  const cars = [];
  const xs = roadCentersX();
  const ys = roadCentersY();
  for (let i = 0; i < CAR.trafficCount; i += 1) {
    if (rng.chance(0.55)) {
      const cx = rng.pick(xs);
      const dir = rng.chance(0.5) ? 1 : -1;
      const x = cx + dir * ROADS.laneOffset * -1;
      const y = rng.range(140, 2400);
      const car = createCar(x, y, dir > 0 ? Math.PI / 2 : -Math.PI / 2, rng.pick(CAR_COLORS), 'traffic');
      car.speed = CAR.trafficSpeed * rng.range(0.7, 1.05);
      car.axis = 'v';
      car.dir = dir;
      car.roadCenter = cx;
      cars.push(car);
    } else {
      const cy = rng.pick(ys);
      const dir = rng.chance(0.5) ? 1 : -1;
      const y = cy + dir * ROADS.laneOffset;
      const x = rng.range(140, 2900);
      const car = createCar(x, y, dir > 0 ? 0 : Math.PI, rng.pick(CAR_COLORS), 'traffic');
      car.speed = CAR.trafficSpeed * rng.range(0.7, 1.05);
      car.axis = 'h';
      car.dir = dir;
      car.roadCenter = cy;
      cars.push(car);
    }
  }
  return cars;
}

function trafficObstacleAhead(car, state, lookAhead) {
  const fx = car.x + Math.cos(car.angle) * lookAhead;
  const fy = car.y + Math.sin(car.angle) * lookAhead;
  for (const other of state.cars) {
    if (other === car || other.health <= 0) continue;
    if (distanceBetween(fx, fy, other.x, other.y) < 30) return true;
  }
  for (const cop of state.policeCars) {
    if (distanceBetween(fx, fy, cop.x, cop.y) < 30) return true;
  }
  if (state.player.car !== car && distanceBetween(fx, fy, state.player.x, state.player.y) < 26) return true;
  for (const ped of state.peds) {
    if (ped.alive && distanceBetween(fx, fy, ped.x, ped.y) < 22) return true;
  }
  return false;
}

function maybeTurnAtIntersection(car, rng) {
  const xs = roadCentersX();
  const ys = roadCentersY();
  if (car.axis === 'v') {
    for (const cy of ys) {
      if (Math.abs(car.y - cy) < 6 && rng.chance(0.4)) {
        const dir = rng.chance(0.5) ? 1 : -1;
        car.axis = 'h';
        car.dir = dir;
        car.roadCenter = cy;
        return;
      }
    }
  } else {
    for (const cx of xs) {
      if (Math.abs(car.x - cx) < 6 && rng.chance(0.4)) {
        const dir = rng.chance(0.5) ? 1 : -1;
        car.axis = 'v';
        car.dir = dir;
        car.roadCenter = cx;
        return;
      }
    }
  }
}

export function updateTrafficCar(car, state, dt, rng) {
  if (car.kind !== 'traffic' || car.health <= 0) return;
  if (car === state.player.car) return;
  const blocked = trafficObstacleAhead(car, state, 58);
  const targetSpeed = blocked ? 0 : CAR.trafficSpeed;
  car.brakeLights = blocked;
  if (blocked && car.honkTimer <= 0) car.honkTimer = rng.range(1.5, 4);
  car.honkTimer -= dt;
  car.speed += clamp(targetSpeed - car.speed, -260 * dt, 120 * dt);

  let targetX;
  let targetY;
  if (car.axis === 'v') {
    targetX = car.roadCenter - car.dir * ROADS.laneOffset;
    targetY = car.y + car.dir * 200;
    if ((car.dir > 0 && car.y > 2480) || (car.dir < 0 && car.y < 120)) {
      car.dir *= -1;
    }
  } else {
    targetX = car.x + car.dir * 200;
    targetY = car.roadCenter + car.dir * ROADS.laneOffset;
    if ((car.dir > 0 && car.x > 2960) || (car.dir < 0 && car.x < 120)) {
      car.dir *= -1;
    }
  }
  const wanted = angleTowards(car.x, car.y, targetX, targetY);
  car.angle = lerpAngle(car.angle, wanted, Math.min(1, 4.2 * dt));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  maybeTurnAtIntersection(car, rng);
  if (!isOnRoad(car.x, car.y)) {
    const back = state.city ? null : null;
    void back;
  }
}

export function driveCarPhysics(car, input, dt) {
  const up = input.isDown('KeyW') || input.isDown('ArrowUp');
  const down = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');
  const handbrake = input.isDown('Space');
  if (up) car.speed += CAR.accel * dt;
  if (down) {
    if (car.speed > 12) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.6 * dt;
  }
  car.brakeLights = down || handbrake;
  const dragRate = handbrake ? 2.4 : CAR.drag;
  car.speed -= car.speed * dragRate * dt * 0.55;
  car.speed = clamp(car.speed, -CAR.reverseMax, 430);
  const steerInput = (left ? -1 : 0) + (right ? 1 : 0);
  car.steer += clamp(steerInput - car.steer, -8 * dt, 8 * dt);
  const grip = handbrake ? 3.1 : CAR.grip;
  if (Math.abs(car.speed) > 4) {
    car.angle += car.steer * grip * 0.36 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 130);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return Math.abs(car.speed);
}

export function carSpeedRatio(car) {
  return clamp(car.speed / 430, -1, 1);
}
