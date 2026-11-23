// Keyboard and mouse state: held keys, edge-triggered presses, mouse position and buttons.

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const input = {
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    mouseClicked: false,
    isDown(code) { return held.has(code); },
    wasPressed(code) { return pressed.has(code); },
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      const len = Math.sqrt(x * x + y * y) || 1;
      return { x: x / len, y: y / len, active: x !== 0 || y !== 0 };
    },
    endFrame() {
      pressed.clear();
      input.mouseClicked = false;
    },
  };

  window.addEventListener('keydown', (event) => {
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.mouseClicked = true;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return input;
}
