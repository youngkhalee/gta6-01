// Deterministic screenshot scenes behind ?shot=start|play|chase|mission.
// Each scene arranges the real game state - same city, cars, people and HUD the player sees.
import { createCar } from './vehicles.js';

function placeTrafficNear(state, x, y) {
  const spots = [[-190, -52, 0], [150, 52, Math.PI], [-60, 52, Math.PI], [260, -52, 0], [60, -52, 0]];
  let i = 0;
  for (const car of state.cars) {
    if (car.kind !== 'traffic' || i >= spots.length) continue;
    const s = spots[i];
    i += 1;
    car.x = x + s[0];
    car.y = y + s[1];
    car.angle = s[2];
    car.speed = 60;
  }
}

function placePedsNear(state, x, y) {
  const offsets = [[-90, -70], [-40, 66], [80, -68], [130, 64], [-150, 60], [200, -66]];
  let i = 0;
  for (const ped of state.peds) {
    if (i >= offsets.length) break;
    ped.x = x + offsets[i][0];
    ped.y = y + offsets[i][1];
    i += 1;
  }
}

export function stageShot(state, name) {
  state.missions.dialogue = [];
  state.clock = 0.32;
  if (name === 'start') {
    state.player.x = 700;
    state.player.y = 668;
    placeTrafficNear(state, 680, 620);
    placePedsNear(state, 700, 668);
    state.screen = 'title';
    return;
  }
  if (name === 'chase') {
    state.player.x = 1120;
    state.player.y = 572;
    placeTrafficNear(state, 1500, 620);
    const car = createCar(1120, 572, 0, '#e74c3c', 'player');
    car.speed = 265;
    state.cars.push(car);
    state.player.car = car;
    state.wanted.stars = 3;
    state.cash = 640;
    const copSpots = [[-170, 48, 0.06], [-265, 48, -0.04], [-355, 48, 0.02]];
    for (const s of copSpots) {
      const cop = createCar(1120 + s[0], 572 + s[1], s[2], '#f5f6fa', 'police');
      cop.speed = 250;
      cop.health = 130;
      state.policeCars.push(cop);
    }
    placePedsNear(state, 1300, 690);
    state.screen = 'play';
    return;
  }
  if (name === 'mission') {
    state.player.x = 900;
    state.player.y = 572;
    placeTrafficNear(state, 1250, 620);
    const car = createCar(900, 572, 0, '#00cec9', 'player');
    car.speed = 190;
    state.cars.push(car);
    state.player.car = car;
    state.missions.index = 1;
    state.missions.step = 0;
    state.missions.dialogue = [{
      who: 'Rico',
      text: 'Package in the trunk, no questions. Take it to the Neon Marina pier, east beach - and keep it clean, Vale.',
    }];
    state.cash = 390;
    placePedsNear(state, 1050, 690);
    state.screen = 'play';
    return;
  }
  state.player.x = 700;
  state.player.y = 668;
  state.player.aimAngle = 0.4;
  state.cash = 215;
  placeTrafficNear(state, 680, 620);
  placePedsNear(state, 700, 668);
  state.screen = 'play';
}
