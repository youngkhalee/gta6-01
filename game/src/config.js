// Neon Harbor tuning: world size, road grid, palette and gameplay constants in one place.

export const WORLD = { width: 3400, height: 2600 };
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const ROADS = {
  spacingX: 420,
  spacingY: 380,
  width: 96,
  laneOffset: 24,
  firstX: 260,
  firstY: 240,
};

export const BEACH = { sandX: 3020, waterX: 3160 };

export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  sprintSpeed: 262,
  health: 100,
  armor: 50,
};

export const CAR = {
  width: 46,
  height: 22,
  accel: 340,
  brake: 520,
  reverseMax: 120,
  drag: 0.86,
  grip: 7.5,
  trafficSpeed: 150,
  trafficCount: 26,
  parkedCount: 30,
};

export const PED = { count: 34, walkSpeed: 52, fleeSpeed: 148, health: 30 };

export const POLICE = {
  maxStars: 5,
  carSpeed: 305,
  footSpeed: 178,
  bustRadius: 46,
  bustTime: 2.4,
  sightRange: 430,
  decayDelay: 9,
};

export const WEAPON = {
  name: 'Harbor Pistol',
  damage: 16,
  range: 460,
  cooldown: 0.21,
  spread: 0.035,
  magSize: 12,
  reloadTime: 1.1,
  reserveStart: 60,
};

export const DAY_LENGTH = 240;

export const PALETTE = {
  grass: '#57a75a',
  grassDark: '#4c9850',
  sidewalk: '#cfc8b8',
  road: '#3b3f46',
  roadEdge: '#e8e3d3',
  lane: '#f5d76e',
  sand: '#f2dd9b',
  water: '#2e9bc6',
  waterDeep: '#227fa8',
  roofA: '#e2725b',
  roofB: '#d95f76',
  roofC: '#5b8e7d',
  roofD: '#f2a65a',
  roofE: '#7d6ba8',
  facade: '#f7ead7',
  windowLit: '#ffe9a3',
  windowDark: '#5d7d95',
  palm: '#2f9e5f',
  trunk: '#9a6b45',
  player: '#ffcf3f',
  blood: '#c0392b',
};

export const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#9b59b6', '#1abc9c', '#e67e22', '#95a5a6', '#fd79a8', '#00cec9'];

export const BUILDING_NAMES = [
  'Coral Hotel', 'Palm Court', 'Marina Bank', 'Sunset Diner', 'Harbor Clinic',
  'Neon Arcade', 'Tide Mall', 'Pelican Suites', 'Cafe Brisa', 'Harbor Gym',
  'Vista Tower', 'Coral Records', 'Dockside Deli', 'Azure Condos', 'Flamingo Bar',
  'Harbor Motors', 'Sun Pharmacy', 'Pier Books', 'Lagoon Lofts', 'Ember Tacos',
];

export const PED_NAMES = ['Mia', 'Leo', 'Sofia', 'Marco', 'Luna', 'Diego', 'Ava', 'Nico', 'Rosa', 'Tomas'];

export const SAVE_KEY = 'neon-harbor-save-v1';
