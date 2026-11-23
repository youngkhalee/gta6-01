// Rendering for Neon Harbor: the city, cars, characters, effects, HUD, minimap and menus.
// Everything is drawn from code on one canvas - no images, no fonts, no network.
import { BEACH, PALETTE, ROADS, VIEW, WORLD } from './config.js';
import { clamp } from './random.js';
import { roadCentersX, roadCentersY } from './city.js';
import { currentMission, currentStep, missionMarker } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT = 'system-ui, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawWorld(ctx, state, cam) {
  const city = state.city;
  const left = cam.x - 40;
  const top = cam.y - 40;
  const right = cam.x + VIEW.width + 40;
  const bottom = cam.y + VIEW.height + 40;

  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(cam.x, cam.y, VIEW.width, VIEW.height);
  ctx.fillStyle = PALETTE.grassDark;
  for (let gx = Math.floor(left / 210) * 210; gx < right; gx += 210) {
    for (let gy = Math.floor(top / 210) * 210; gy < bottom; gy += 210) {
      if (((gx / 210) + (gy / 210)) % 2 === 0) ctx.fillRect(gx, gy, 210, 210);
    }
  }

  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(BEACH.sandX, cam.y, BEACH.waterX - BEACH.sandX, VIEW.height);
  const wave = Math.sin(state.time * 1.4) * 6;
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(BEACH.waterX, cam.y, WORLD.width - BEACH.waterX, VIEW.height);
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(BEACH.waterX + 90 + wave, cam.y, WORLD.width, VIEW.height);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let y = Math.floor(top / 90) * 90; y < bottom; y += 90) {
    ctx.fillRect(BEACH.waterX + 12 + Math.sin(state.time + y) * 5, y, 44, 4);
  }

  ctx.fillStyle = PALETTE.sidewalk;
  for (const cx of roadCentersX()) ctx.fillRect(cx - ROADS.width / 2 - 13, cam.y, ROADS.width + 26, VIEW.height);
  for (const cy of roadCentersY()) ctx.fillRect(cam.x, cy - ROADS.width / 2 - 13, VIEW.width, ROADS.width + 26);

  ctx.fillStyle = PALETTE.road;
  for (const cx of roadCentersX()) ctx.fillRect(cx - ROADS.width / 2, cam.y, ROADS.width, VIEW.height);
  for (const cy of roadCentersY()) ctx.fillRect(cam.x, cy - ROADS.width / 2, VIEW.width, ROADS.width);

  ctx.strokeStyle = PALETTE.lane;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 22]);
  ctx.beginPath();
  for (const cx of roadCentersX()) { ctx.moveTo(cx, cam.y); ctx.lineTo(cx, cam.y + VIEW.height); }
  for (const cy of roadCentersY()) { ctx.moveTo(cam.x, cy); ctx.lineTo(cam.x + VIEW.width, cy); }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = PALETTE.roadEdge;
  for (const cx of roadCentersX()) {
    ctx.fillRect(cx - ROADS.width / 2 - 3, cam.y, 3, VIEW.height);
    ctx.fillRect(cx + ROADS.width / 2, cam.y, 3, VIEW.height);
  }

  for (const bench of city.benches) {
    if (bench.x < left || bench.x > right || bench.y < top || bench.y > bottom) continue;
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(bench.x - 14, bench.y - 4, 28, 8);
  }
  for (const lamp of city.lamps) {
    if (lamp.x < left || lamp.x > right || lamp.y < top || lamp.y > bottom) continue;
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    if (state.night > 0.25) {
      ctx.fillStyle = 'rgba(255,233,163,0.20)';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const b of city.buildings) {
    if (b.x + b.w < left || b.x > right || b.y + b.h < top || b.y > bottom) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    ctx.fillStyle = PALETTE.facade;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, 7);
    ctx.fillStyle = state.night > 0.4 ? PALETTE.windowLit : PALETTE.windowDark;
    const seed = b.seed;
    for (let wx = 0; wx < b.windowsAcross; wx += 1) {
      for (let wy = 0; wy < b.windowsDown; wy += 1) {
        if (((seed + wx * 7 + wy * 13) % 5) === 0) continue;
        ctx.fillRect(b.x + 11 + wx * 24, b.y + 11 + wy * 22, 11, 9);
      }
    }
    ctx.fillStyle = 'rgba(20,20,30,0.85)';
    ctx.font = 'bold 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h - 8);
  }

  for (const palm of city.palms) {
    if (palm.x < left || palm.x > right || palm.y < top || palm.y > bottom) continue;
    drawPalm(ctx, palm.x, palm.y, palm.size);
  }

  drawObjectiveMarker(ctx, state);

  for (const car of state.cars) drawCar(ctx, car, state);
  for (const cop of state.policeCars) drawCar(ctx, cop, state, true);
  for (const ped of state.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.skin, ped.walkPhase, ped.alive);
  for (const h of state.hostiles) {
    if (h.alive) drawPerson(ctx, h.x, h.y, h.angle, '#d63031', '#e0ac69', h.walkPhase, true);
  }
  for (const officer of state.officers) {
    if (officer.alive) drawPerson(ctx, officer.x, officer.y, officer.angle, '#27348b', '#f1c27d', officer.walkPhase, true);
  }

  const p = state.player;
  if (!p.car) {
    ctx.strokeStyle = 'rgba(255,209,26,0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17 + Math.sin(state.time * 5) * 2, 0, Math.PI * 2);
    ctx.stroke();
    drawPerson(ctx, p.x, p.y, p.aimAngle, PALETTE.player, '#8d5524', p.walkPhase, true, true);
    if (state.time % 0.001 === 0) void 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.aimAngle) * 26, p.y + Math.sin(p.aimAngle) * 26);
    ctx.stroke();
  }

  drawEffects(ctx, state);

  if (state.night > 0.02) {
    ctx.fillStyle = 'rgba(16,20,52,' + (state.night * 0.34).toFixed(3) + ')';
    ctx.fillRect(cam.x, cam.y, VIEW.width, VIEW.height);
    if (p.car) drawHeadlight(ctx, p.car);
    for (const cop of state.policeCars) drawHeadlight(ctx, cop);
  }
}

function drawPalm(ctx, x, y, size) {
  ctx.strokeStyle = PALETTE.trunk;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 3, y - 8);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.palm;
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 8);
    ctx.quadraticCurveTo(x + 3 + Math.cos(a) * size * 0.7, y - 8 + Math.sin(a) * size * 0.4 - 4, x + 3 + Math.cos(a) * size, y - 4 + Math.sin(a) * size * 0.55);
    ctx.stroke();
  }
}

function drawObjectiveMarker(ctx, state) {
  const marker = missionMarker(state);
  const pulse = 4 + Math.sin(state.time * 5) * 2;
  if (marker) {
    ctx.fillStyle = 'rgba(255,209,26,0.30)';
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 42 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd11a';
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('!', marker.x, marker.y + 5);
  }
  if (state.sideJob) {
    ctx.fillStyle = 'rgba(255,159,67,0.9)';
    ctx.beginPath();
    ctx.arc(state.sideJob.x, state.sideJob.y, 10 + pulse * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('$', state.sideJob.x, state.sideJob.y + 4);
  }
}

export function drawCar(ctx, car, state, isPolice) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, -car.width / 2 + 3, -car.height / 2 + 4, car.width, car.height, 6);
  ctx.fill();
  ctx.fillStyle = isPolice ? '#f5f6fa' : car.color;
  roundRect(ctx, -car.width / 2, -car.height / 2, car.width, car.height, 6);
  ctx.fill();
  ctx.fillStyle = isPolice ? '#27348b' : 'rgba(20,30,45,0.88)';
  roundRect(ctx, -6, -car.height / 2 + 3, 17, car.height - 6, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,230,255,0.95)';
  ctx.fillRect(2, -car.height / 2 + 4, 5, car.height - 8);
  ctx.fillStyle = '#111';
  ctx.fillRect(-car.width / 2 + 3, -car.height / 2 - 2, 10, 4);
  ctx.fillRect(-car.width / 2 + 3, car.height / 2 - 2, 10, 4);
  ctx.fillRect(car.width / 2 - 13, -car.height / 2 - 2, 10, 4);
  ctx.fillRect(car.width / 2 - 13, car.height / 2 - 2, 10, 4);
  ctx.fillStyle = '#ffeaa7';
  ctx.fillRect(car.width / 2 - 2, -car.height / 2 + 2, 3, 5);
  ctx.fillRect(car.width / 2 - 2, car.height / 2 - 7, 3, 5);
  if (car.brakeLights) {
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(-car.width / 2 - 1, -car.height / 2 + 2, 3, 5);
    ctx.fillRect(-car.width / 2 - 1, car.height / 2 - 7, 3, 5);
  }
  if (isPolice) {
    const on = Math.floor(state.time * 4 + car.flashPhase) % 2 === 0;
    ctx.fillStyle = on ? '#ff3030' : '#3070ff';
    roundRect(ctx, -8, -5, 16, 10, 3);
    ctx.fill();
    ctx.fillStyle = on ? 'rgba(255,48,48,0.25)' : 'rgba(48,112,255,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.health < 55) {
    ctx.fillStyle = 'rgba(60,60,60,' + (0.25 + Math.sin(state.time * 9 + car.id) * 0.1) + ')';
    ctx.beginPath();
    ctx.arc(-10, 0, 8 + (55 - car.health) * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (state.missionCar === car) {
    ctx.strokeStyle = '#ffd11a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(car.x, car.y, 36 + Math.sin(state.time * 5) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHeadlight(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const grad = ctx.createLinearGradient(20, 0, 120, 0);
  grad.addColorStop(0, 'rgba(255,240,180,0.28)');
  grad.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(20, -10);
  ctx.lineTo(122, -30);
  ctx.lineTo(122, 30);
  ctx.lineTo(20, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawPerson(ctx, x, y, angle, shirt, skin, walkPhase, alive, isPlayer) {
  if (!alive) {
    ctx.fillStyle = PALETTE.blood;
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 9, angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 5.5, angle, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const bob = Math.sin(walkPhase) * 1.6;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2d3436';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + 2.5) * (8 + bob), y + Math.sin(angle + 2.5) * (8 + bob));
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - 2.5) * (8 - bob), y + Math.sin(angle - 2.5) * (8 - bob));
  ctx.stroke();
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x + Math.cos(angle) * 2, y + Math.sin(angle) * 2, 5.4, 0, Math.PI * 2);
  ctx.fill();
  if (isPlayer) {
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 12.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEffects(ctx, state) {
  for (const b of state.bullets) {
    ctx.strokeStyle = b.fromEnemy ? 'rgba(255,90,90,0.9)' : 'rgba(255,230,130,0.95)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(b.angle) * 13, b.y - Math.sin(b.angle) * 13);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const fx of state.particles) {
    const a = clamp(fx.life / fx.maxLife, 0, 1);
    ctx.fillStyle = fx.color;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.size * a + 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (state.muzzle > 0 && !state.player.car) {
    const p = state.player;
    ctx.fillStyle = 'rgba(255,190,60,0.9)';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.aimAngle) * 24, p.y + Math.sin(p.aimAngle) * 24, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMinimap(ctx, state, x, y, size) {
  const scale = size / WORLD.width;
  ctx.save();
  ctx.fillStyle = 'rgba(14,22,32,0.82)';
  roundRect(ctx, x - 6, y - 6, size + 12, (WORLD.height * scale) + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#3f7a44';
  ctx.fillRect(x, y, size, WORLD.height * scale);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x + BEACH.waterX * scale, y, (WORLD.width - BEACH.waterX) * scale, WORLD.height * scale);
  ctx.fillStyle = '#8d939c';
  for (const cx of roadCentersX()) ctx.fillRect(x + cx * scale - 1, y, 2.4, WORLD.height * scale);
  for (const cy of roadCentersY()) ctx.fillRect(x, y + cy * scale - 1, size, 2.4);
  ctx.fillStyle = 'rgba(240,220,190,0.8)';
  for (const b of state.city.buildings) ctx.fillRect(x + b.x * scale, y + b.y * scale, Math.max(1.6, b.w * scale), Math.max(1.6, b.h * scale));
  const marker = missionMarker(state);
  if (marker) {
    ctx.fillStyle = '#ffd11a';
    ctx.beginPath();
    ctx.arc(x + marker.x * scale, y + marker.y * scale, 4.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.sideJob) {
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(x + state.sideJob.x * scale, y + state.sideJob.y * scale, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3070ff';
  for (const cop of state.policeCars) {
    ctx.fillRect(x + cop.x * scale - 2, y + cop.y * scale - 2, 4, 4);
  }
  const p = state.player;
  ctx.save();
  ctx.translate(x + p.x * scale, y + p.y * scale);
  ctx.rotate(p.car ? p.car.angle : p.aimAngle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function bar(ctx, x, y, w, ratio, color, label) {
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  roundRect(ctx, x - 3, y - 3, w + 6, 17, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(ratio, 0, 1), 11);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 3, y + 9);
}

export function drawHUD(ctx, state) {
  const p = state.player;
  bar(ctx, 22, 20, 190, p.health / 100, '#e8433c', 'HEALTH');
  bar(ctx, 22, 44, 130, p.armor / 50, '#4aa3ff', 'ARMOR');
  if (state.wanted.bustProgress > 0) bar(ctx, 22, 68, 160, state.wanted.bustProgress, '#ff9f43', 'BUSTED...');

  ctx.textAlign = 'right';
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 30px ' + FONT;
  ctx.fillText('$' + state.cash, VIEW.width - 22, 42);
  ctx.font = 'bold 26px ' + FONT;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < state.wanted.stars ? '#ffd11a' : 'rgba(255,255,255,0.28)';
    ctx.fillText('★', VIEW.width - 150 + i * 28, 76);
  }
  ctx.fillStyle = '#eef1f5';
  ctx.font = '15px ' + FONT;
  ctx.fillText(state.clockText, VIEW.width - 22, 100);
  ctx.fillText(p.car ? 'DRIVING' : 'ON FOOT', VIEW.width - 22, 122);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  const mission = currentMission(state);
  const step = currentStep(state);
  roundRect(ctx, 18, VIEW.height - 118, 470, 66, 9);
  ctx.fill();
  ctx.fillStyle = '#ffd11a';
  ctx.font = 'bold 14px ' + FONT;
  ctx.fillText(mission.title.toUpperCase(), 30, VIEW.height - 94);
  ctx.fillStyle = '#eef1f5';
  ctx.font = '14px ' + FONT;
  ctx.fillText(step ? step.text : '', 30, VIEW.height - 70);
  if (state.sideJob) {
    ctx.fillStyle = '#ffb26b';
    ctx.font = '12.5px ' + FONT;
    ctx.fillText('Side job: ' + state.sideJob.text + ' (+$' + state.sideJob.pay + ')', 30, VIEW.height - 54 + 36);
  }

  ctx.fillStyle = '#eef1f5';
  ctx.font = 'bold 15px ' + FONT;
  ctx.textAlign = 'right';
  const ammoText = state.reloading > 0 ? 'RELOADING...' : 'PISTOL  ' + state.ammo + ' / ' + state.reserve;
  ctx.fillText(ammoText, VIEW.width - 22, VIEW.height - 24);
  if (state.nearCar && !p.car) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,14,20,0.75)';
    roundRect(ctx, VIEW.width / 2 - 130, VIEW.height - 168, 260, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText('Press E to enter car', VIEW.width / 2, VIEW.height - 147);
  }
  drawMinimap(ctx, state, VIEW.width - 212, 152, 188);
}

export function drawMessage(ctx, state) {
  if (state.messageTimer > 0 && state.message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,14,20,0.78)';
    const w = ctx.measureText(state.message).width + 44;
    roundRect(ctx, VIEW.width / 2 - w / 2, 96, w, 38, 9);
    ctx.fill();
    ctx.fillStyle = '#ffe9a3';
    ctx.font = 'bold 17px ' + FONT;
    ctx.fillText(state.message, VIEW.width / 2, 121);
  }
  const ms = state.missions;
  if (ms.bannerTimer > 0 && ms.banner) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd11a';
    ctx.font = 'bold 34px ' + FONT;
    ctx.fillText(ms.banner, VIEW.width / 2, 190);
  }
}

export function drawDialogue(ctx, state) {
  const line = state.missions.dialogue[0];
  if (!line) return;
  ctx.fillStyle = 'rgba(8,10,18,0.88)';
  roundRect(ctx, 190, VIEW.height - 210, VIEW.width - 380, 78, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffd11a';
  ctx.lineWidth = 1.6;
  roundRect(ctx, 190, VIEW.height - 210, VIEW.width - 380, 78, 12);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd11a';
  ctx.font = 'bold 15px ' + FONT;
  ctx.fillText(line.who, 214, VIEW.height - 182);
  ctx.fillStyle = '#f5f6fa';
  ctx.font = '15.5px ' + FONT;
  wrapText(ctx, line.text, 214, VIEW.height - 160, VIEW.width - 428, 19);
  ctx.fillStyle = '#9aa5b1';
  ctx.font = '12px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText('ENTER ▸', VIEW.width - 214, VIEW.height - 140);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawTitleScreen(ctx, state, hasSaveGame) {
  ctx.fillStyle = 'rgba(10,8,26,0.52)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const grad = ctx.createLinearGradient(0, 120, 0, 300);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(1, '#ff7518');
  ctx.fillStyle = grad;
  ctx.textAlign = 'center';
  ctx.font = 'bold 96px ' + FONT;
  ctx.fillText('NEON HARBOR', VIEW.width / 2, 218);
  ctx.fillStyle = '#f5f6fa';
  ctx.font = '19px ' + FONT;
  ctx.fillText('An open-world crime story in a sun-soaked coastal city.', VIEW.width / 2, 262);
  ctx.font = '16px ' + FONT;
  ctx.fillStyle = '#dfe6ee';
  ctx.fillText('Vale Cruz came home to Neon Harbor to start clean. One old friend, one stolen car,', VIEW.width / 2, 316);
  ctx.fillText('and the whole marina turf war says otherwise. Drive, run, hustle - and stay ahead of Harbor PD.', VIEW.width / 2, 340);
  ctx.font = 'bold 21px ' + FONT;
  ctx.fillStyle = '#7dff8a';
  ctx.fillText(hasSaveGame ? 'ENTER - Continue      N - New Game' : 'ENTER - New Game', VIEW.width / 2, 420);
  ctx.fillStyle = '#cfd8e3';
  ctx.font = '15.5px ' + FONT;
  ctx.fillText('WASD move / drive · Mouse aim · Click or F shoot · E enter & exit car · Shift sprint', VIEW.width / 2, 470);
  ctx.fillText('R reload · P pause · M save · Complete story missions, taxi fares, races and packages', VIEW.width / 2, 496);
  ctx.fillStyle = '#9aa5b1';
  ctx.font = '13px ' + FONT;
  ctx.fillText('5 story missions · wanted system · traffic & pedestrians · day and night cycle', VIEW.width / 2, 540);
  void state;
}

export function drawPauseScreen(ctx) {
  ctx.fillStyle = 'rgba(8,10,18,0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f6fa';
  ctx.font = 'bold 52px ' + FONT;
  ctx.fillText('PAUSED', VIEW.width / 2, 300);
  ctx.font = '18px ' + FONT;
  ctx.fillStyle = '#cfd8e3';
  ctx.fillText('P - resume · M - save game · Your progress also saves after every mission', VIEW.width / 2, 348);
}

export function drawEndScreen(ctx, state, kind) {
  ctx.fillStyle = kind === 'busted' ? 'rgba(20,26,80,0.62)' : 'rgba(90,10,10,0.58)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px ' + FONT;
  ctx.fillText(kind === 'busted' ? 'BUSTED' : 'WASTED', VIEW.width / 2, 320);
  ctx.font = '19px ' + FONT;
  ctx.fillStyle = '#eef1f5';
  const fee = kind === 'busted' ? 'Harbor PD impounds your ride and fines you $120.' : 'Harbor Clinic patches you up for $150.';
  ctx.fillText(fee, VIEW.width / 2, 366);
  ctx.fillText('Cash: $' + state.cash + ' · Missions done: ' + state.stats.missionsDone, VIEW.width / 2, 398);
}
