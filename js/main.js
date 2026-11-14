import { MAP_CONFIG, ZONES } from "./tejgaonMapData.js";
import { CityRenderer } from "./cityRenderer.js";

const canvas = document.getElementById("cityCanvas");
const ctx = canvas.getContext("2d");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");

const zoneLabel = document.getElementById("zoneLabel");
const coordLabel = document.getElementById("coordLabel");
const zoomLabel = document.getElementById("zoomLabel");

const renderer = new CityRenderer();

// Scout entity (Step 1 free-roam observer; will become player/vehicle controller in Step 2)
const scout = {
  x: MAP_CONFIG.spawn.x,
  y: MAP_CONFIG.spawn.y,
  speed: 440,
  angle: -Math.PI / 2
};

const camera = {
  x: scout.x,
  y: scout.y,
  zoom: 0.85,
  freePan: false
};

const keys = new Set();
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let touchVec = { x: 0, y: 0 };

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Keyboard input
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);

  if (e.code === "Space") {
    camera.freePan = false;
  } else if (k === "=" || k === "+") {
    camera.zoom = Math.min(2.2, camera.zoom + 0.12);
  } else if (k === "-" || k === "_") {
    camera.zoom = Math.max(0.32, camera.zoom - 0.12);
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

// Mouse wheel zoom
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    camera.zoom = Math.max(0.32, Math.min(2.2, camera.zoom * factor));
  },
  { passive: false }
);

// Right-click or middle-click free camera pan
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 2 || e.button === 1 || e.shiftKey) {
    isDragging = true;
    camera.freePan = true;
    dragStart = { x: e.clientX, y: e.clientY };
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const dx = (e.clientX - dragStart.x) / camera.zoom;
  const dy = (e.clientY - dragStart.y) / camera.zoom;
  camera.x = Math.max(0, Math.min(MAP_CONFIG.width, camera.x - dx));
  camera.y = Math.max(0, Math.min(MAP_CONFIG.height, camera.y - dy));
  dragStart = { x: e.clientX, y: e.clientY };
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

// Mobile Touch Joystick
const touchZone = document.getElementById("touchZone");
const touchKnob = document.getElementById("touchKnob");

touchZone.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const rect = touchZone.getBoundingClientRect();
  const touch = e.touches[0];
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = touch.clientX - cx;
  let dy = touch.clientY - cy;
  const dist = Math.hypot(dx, dy);
  const maxR = 34;
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  touchKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  touchVec = { x: dx / maxR, y: dy / maxR };
});

touchZone.addEventListener("touchend", () => {
  touchKnob.style.transform = "translate(0px, 0px)";
  touchVec = { x: 0, y: 0 };
});

function updateHUD() {
  // Interpolate real GPS coordinates for Tejgaon
  const { minLat, maxLat, minLng, maxLng } = MAP_CONFIG.bounds;
  const lat = maxLat - (scout.y / MAP_CONFIG.height) * (maxLat - minLat);
  const lng = minLng + (scout.x / MAP_CONFIG.width) * (maxLng - minLng);
  coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
  zoomLabel.textContent = `${camera.zoom.toFixed(2)}x`;

  // Detect active Tejgaon sub-zone
  let currentZone = "Tejgaon Sector (Dhaka)";
  for (const z of ZONES) {
    if (
      scout.x >= z.x &&
      scout.x <= z.x + z.w &&
      scout.y >= z.y &&
      scout.y <= z.y + z.h
    ) {
      currentZone = z.name;
      break;
    }
  }
  zoneLabel.textContent = currentZone;
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  let vx = touchVec.x;
  let vy = touchVec.y;
  if (keys.has("w") || keys.has("arrowup")) vy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) vy += 1;
  if (keys.has("a") || keys.has("arrowleft")) vx -= 1;
  if (keys.has("d") || keys.has("arrowright")) vx += 1;

  const mag = Math.hypot(vx, vy);
  if (mag > 0) {
    vx /= mag;
    vy /= mag;
    scout.x = Math.max(30, Math.min(MAP_CONFIG.width - 30, scout.x + vx * scout.speed * dt));
    scout.y = Math.max(30, Math.min(MAP_CONFIG.height - 30, scout.y + vy * scout.speed * dt));
    scout.angle = Math.atan2(vy, vx);
    camera.freePan = false;
  }

  if (!camera.freePan) {
    camera.x += (scout.x - camera.x) * 8 * dt;
    camera.y += (scout.y - camera.y) * 8 * dt;
  }

  renderer.renderWorld(ctx, camera, scout);
  renderer.renderMinimap(minimapCtx, camera, scout);
  updateHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
