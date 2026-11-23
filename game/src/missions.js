// Story missions and side activities for Neon Harbor.
// Story: valet Rico Mendes pulls courier Vale Cruz into a turf war over the marina.
import { distanceBetween } from './random.js';

export const STORY_INTRO = [
  { who: 'Rico', text: 'Vale! You made it to Neon Harbor. I valet at the Coral Hotel - and I owe the wrong people.' },
  { who: 'Vale', text: 'You always owe the wrong people, Rico. What do you need?' },
  { who: 'Rico', text: 'Small jobs first. Wheels, drops, pickups. Do them clean and the marina crew leaves us alone.' },
];

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    active: true,
    dialogue: STORY_INTRO.slice(),
    dialogueTimer: 0,
    targetCarId: null,
    complete: false,
    banner: '',
    bannerTimer: 0,
  };
}

export const STORY_MISSIONS = [
  {
    title: 'First Wheels',
    giver: 'Rico',
    reward: 150,
    intro: [
      { who: 'Rico', text: 'I need a ride that is not mine. Grab any parked car near the hotel and bring it to my garage.' },
      { who: 'Vale', text: 'Stealing a car in broad daylight. Great start, Rico.' },
    ],
    steps: [
      { type: 'steal', text: 'Steal a parked car', hint: 'Press E next to a parked car' },
      { type: 'goto', x: 330, y: 2140, text: 'Deliver the car to Rico Garage', radius: 70 },
    ],
    outro: [{ who: 'Rico', text: 'Beautiful. The marina crew pays for wheels like this. More work soon.' }],
  },
  {
    title: 'Marina Drop',
    giver: 'Rico',
    reward: 220,
    intro: [
      { who: 'Rico', text: 'Package in the trunk, no questions. Take it to the Neon Marina pier, east beach.' },
      { who: 'Vale', text: 'If it ticks, I am throwing it in the water.' },
    ],
    steps: [
      { type: 'goto', x: 3060, y: 620, text: 'Deliver the package to Neon Marina', radius: 80 },
      { type: 'escape', stars: 1, text: 'Lose the police heat', radius: 0 },
    ],
    outro: [{ who: 'Rico', text: 'Crew is happy. They said the new courier has style.' }],
  },
  {
    title: 'Hot Pursuit Hearts',
    giver: 'Sofia',
    reward: 300,
    intro: [
      { who: 'Sofia', text: 'My brother Tomas raced the Flamingo crew and lost his ride. Win it back - follow the checkpoints!' },
    ],
    steps: [
      { type: 'race', text: 'Run the checkpoint race (0 of 4)', checkpoints: [[700, 620], [1120, 1000], [1540, 620], [1960, 1000]], done: 0, radius: 78 },
    ],
    outro: [{ who: 'Sofia', text: 'That is his car back and his pride. You are a legend, Vale.' }],
  },
  {
    title: 'Dockside Trouble',
    giver: 'Rico',
    reward: 380,
    intro: [
      { who: 'Rico', text: 'Flamingo crew jumped our guys by the docks. Clear them out - carefully, they shoot back.' },
      { who: 'Vale', text: 'Carefully. Sure. With a pistol.' },
    ],
    steps: [
      { type: 'shootout', x: 2380, y: 1760, count: 3, text: 'Clear the Flamingo crew at the docks (0 of 3)', radius: 260 },
    ],
    outro: [{ who: 'Rico', text: 'Docks are ours again. One last job and we are square with everyone.' }],
  },
  {
    title: 'The Azure Score',
    giver: 'Rico',
    reward: 500,
    intro: [
      { who: 'Rico', text: 'Azure Condos safe run. Grab the marked sports car, hit the condo drop, then vanish. Cops will come hot.' },
    ],
    steps: [
      { type: 'steal', text: 'Steal the marked Azure sports car', hint: 'Follow the gold marker', marked: true },
      { type: 'goto', x: 1540, y: 240, text: 'Reach the Azure Condos drop', radius: 80 },
      { type: 'escape', stars: 2, text: 'Escape the police and finish the score', radius: 0 },
    ],
    outro: [{ who: 'Rico', text: 'We did it, Vale. Neon Harbor is ours - drinks at the Flamingo Bar, my treat.' }],
  },
  {
    title: 'Harbor Free Roam',
    giver: 'Vale',
    reward: 0,
    intro: [{ who: 'Vale', text: 'Story complete. The city is yours: taxi fares, races and packages pay forever.' }],
    steps: [{ type: 'free', text: 'Free roam - earn cash with side jobs (M to save)', radius: 0 }],
    outro: [],
  },
];

export function currentMission(state) {
  return STORY_MISSIONS[Math.min(state.missions.index, STORY_MISSIONS.length - 1)];
}

export function currentStep(state) {
  const m = currentMission(state);
  return m.steps[Math.min(state.missions.step, m.steps.length - 1)];
}

export function missionMarker(state) {
  const step = currentStep(state);
  if (!step) return null;
  if (step.type === 'goto') return { x: step.x, y: step.y, label: 'Drop-off' };
  if (step.type === 'race') {
    const cp = step.checkpoints[Math.min(step.done, step.checkpoints.length - 1)];
    return { x: cp[0], y: cp[1], label: 'Checkpoint' };
  }
  if (step.type === 'shootout') return { x: step.x, y: step.y, label: 'Docks' };
  if (step.type === 'steal' && step.marked && state.missionCar) return { x: state.missionCar.x, y: state.missionCar.y, label: 'Target car' };
  return null;
}

export function startMissionDialogue(state) {
  const m = currentMission(state);
  state.missions.dialogue = m.intro.slice();
}

export function completeStep(state) {
  const ms = state.missions;
  const m = currentMission(state);
  ms.step += 1;
  if (ms.step >= m.steps.length) {
    state.cash += m.reward;
    ms.banner = m.reward > 0 ? 'Mission complete: ' + m.title + '  +$' + m.reward : m.title;
    ms.bannerTimer = 4;
    ms.dialogue = m.outro.slice();
    ms.index = Math.min(ms.index + 1, STORY_MISSIONS.length - 1);
    ms.step = 0;
    state.stats.missionsDone += 1;
    if (state.audio) {
      state.audio.cash();
      state.audio.missionDone();
    }
    const next = currentMission(state);
    if (state.stats.missionsDone < STORY_MISSIONS.length - 1) {
      ms.dialogue = ms.dialogue.concat(next.intro);
    }
    if (state.save) state.save();
  } else if (state.audio) {
    state.audio.pickup();
  }
}

export function updateMissionStep(state, dt) {
  const ms = state.missions;
  if (ms.bannerTimer > 0) ms.bannerTimer -= dt;
  const step = currentStep(state);
  if (!step) return;
  const p = state.player;
  if (step.type === 'goto') {
    if (distanceBetween(p.x, p.y, step.x, step.y) < step.radius) completeStep(state);
  } else if (step.type === 'race') {
    const cp = step.checkpoints[step.done];
    if (cp && distanceBetween(p.x, p.y, cp[0], cp[1]) < step.radius) {
      step.done += 1;
      step.text = 'Run the checkpoint race (' + step.done + ' of ' + step.checkpoints.length + ')';
      if (state.audio) state.audio.pickup();
      if (step.done >= step.checkpoints.length) completeStep(state);
    }
  } else if (step.type === 'escape') {
    if (state.wanted.stars === 0 && state.wanted.heat < 0.5) completeStep(state);
  } else if (step.type === 'shootout') {
    const remaining = state.hostiles.filter((h) => h.alive).length;
    const total = step.count;
    step.text = 'Clear the Flamingo crew at the docks (' + (total - remaining) + ' of ' + total + ')';
    if (remaining === 0 && state.hostilesSpawned) completeStep(state);
  }
}

// Side activities: taxi fares, package pickups and street races, repeatable forever.
export function createSideJob(rng, player) {
  const kinds = ['taxi', 'package', 'race'];
  const kind = kinds[Math.floor(rng.next() * kinds.length) % kinds.length];
  const spots = [[700, 620], [1120, 240], [1540, 1000], [1960, 620], [2380, 1380], [700, 1760], [1540, 2140], [2380, 240], [3060, 1000]];
  const spot = spots[Math.floor(rng.next() * spots.length) % spots.length];
  const pay = kind === 'taxi' ? 90 : kind === 'package' ? 70 : 130;
  return {
    kind,
    x: spot[0],
    y: spot[1],
    pay,
    text: kind === 'taxi' ? 'Taxi fare: pick up and drop at the gold marker' : kind === 'package' ? 'Package pickup: grab it for cash' : 'Street race: hit the gold checkpoint',
    fromX: player.x,
    fromY: player.y,
  };
}

export function updateSideJob(state, dt) {
  void dt;
  if (!state.sideJob) return;
  const job = state.sideJob;
  const p = state.player;
  if (job.kind === 'package') {
    if (distanceBetween(p.x, p.y, job.x, job.y) < 42) {
      state.cash += job.pay;
      state.stats.packagesDone += 1;
      state.stats.sideDone += 1;
      state.message = 'Package delivered +$' + job.pay;
      state.messageTimer = 2.4;
      if (state.audio) state.audio.cash();
      state.sideJob = null;
    }
  } else if (distanceBetween(p.x, p.y, job.x, job.y) < 64) {
    if (job.kind === 'taxi') state.stats.faresDone += 1;
    state.cash += job.pay;
    state.stats.sideDone += 1;
    state.message = (job.kind === 'taxi' ? 'Fare paid +$' : 'Race won +$') + job.pay;
    state.messageTimer = 2.4;
    if (state.audio) state.audio.cash();
    state.sideJob = null;
  }
}
