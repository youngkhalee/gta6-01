// All sound is synthesized with WebAudio: engine hum, sirens, gunshots, pickups and a sunny bass loop.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = 0;
  let musicStep = 0;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function beep(freq, dur, type, vol, slideTo) {
    if (!ensureContext()) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noiseBurst(dur, vol, low) {
    if (!ensureContext()) return;
    const size = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1800;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  const NOTES = [110, 110, 130.8, 98, 110, 110, 164.8, 146.8];

  return {
    unlock() { ensureContext(); },
    shoot() { noiseBurst(0.09, 0.28, 2600); beep(160, 0.07, 'square', 0.1, 60); },
    dryFire() { beep(900, 0.04, 'square', 0.06); },
    reload() { beep(500, 0.05, 'square', 0.08); setTimeout(() => beep(700, 0.05, 'square', 0.08), 110); },
    hit() { noiseBurst(0.06, 0.16, 900); },
    crash(strength) { noiseBurst(0.22, Math.min(0.4, 0.12 + strength * 0.02), 700); },
    pickup() { beep(660, 0.08, 'sine', 0.16); setTimeout(() => beep(990, 0.12, 'sine', 0.16), 70); },
    cash() { beep(880, 0.07, 'triangle', 0.18); setTimeout(() => beep(1320, 0.14, 'triangle', 0.18), 60); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.16, 'triangle', 0.16), i * 90)); },
    busted() { [400, 350, 300, 220].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'sawtooth', 0.12), i * 130)); },
    door() { beep(240, 0.08, 'square', 0.1, 140); },
    setEngine(on, speedRatio) {
      if (!ctx) return;
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0.035;
        engineOsc.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      if (!on && engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
      if (engineOsc) engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 130;
    },
    setSiren(on) {
      if (!ctx) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'triangle';
        sirenGain.gain.value = 0.018;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
      }
      if (!on && sirenOsc) {
        try { sirenOsc.stop(); } catch { /* already stopped */ }
        sirenOsc = null;
        sirenGain = null;
      }
      if (sirenOsc) sirenOsc.frequency.value = 640 + Math.sin(performance.now() * 0.008) * 190;
    },
    updateMusic(dt, active) {
      if (!ctx || !active) return;
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 0.42;
        const freq = NOTES[musicStep % NOTES.length];
        musicStep += 1;
        beep(freq, 0.3, 'triangle', 0.045);
        if (musicStep % 4 === 0) beep(freq * 2, 0.18, 'sine', 0.03);
      }
    },
  };
}
