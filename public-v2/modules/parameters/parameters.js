import { Paper } from '../../common/paper.js';

// Settings panel — self-contained DOM controls (no shared state needed).

const DEFAULT_ZONE_HEIGHT = 20;

// ============== Rectangle height
const rectInput = document.getElementById('rect-h');
function applyRectH() {
  const height = Math.max(10, Math.min(200, parseInt(rectInput.value) || DEFAULT_ZONE_HEIGHT));
  Paper.defaultZoneHeight = height;
  document.documentElement.style.setProperty('--zone-h', height + 'px');
  document.querySelectorAll('.zone').forEach((zone) => {
    zone.style.minHeight = height + 'px';
  });
}
rectInput.addEventListener('input', applyRectH);
document.getElementById('rect-minus').addEventListener('click', () => {
  rectInput.value = (parseInt(rectInput.value) || DEFAULT_ZONE_HEIGHT) - 1;
  applyRectH();
});
document.getElementById('rect-plus').addEventListener('click', () => {
  rectInput.value = (parseInt(rectInput.value) || DEFAULT_ZONE_HEIGHT) + 1;
  applyRectH();
});

// ============== Panel toggle
const pill = document.getElementById('tweaks-pill');
const panel = document.getElementById('tweaks-panel');
pill.addEventListener('click', () => panel.classList.toggle('open'));

// ============== Book style
document.querySelectorAll('#tw-book-style button').forEach((button) => {
  button.addEventListener('click', () => {
    document
      .querySelectorAll('#tw-book-style button')
      .forEach((styleButton) => styleButton.classList.remove('active'));
    button.classList.add('active');
    document.getElementById('stage').dataset.bookStyle = button.dataset.val;
  });
});

