// Save and load the run in localStorage: cash, mission progress, player position and stats.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      cash: state.cash,
      health: state.player.health,
      armor: state.player.armor,
      missionIndex: state.missions.index,
      sideDone: state.stats.sideDone,
      carsStolen: state.stats.carsStolen,
      faresDone: state.stats.faresDone,
      packagesDone: state.stats.packagesDone,
      playerX: Math.round(state.player.x),
      playerY: Math.round(state.player.y),
      clock: state.clock,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
