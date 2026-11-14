import { MAP_CONFIG, ZONES } from "./tejgaonMapData.js";
import { CityRenderer } from "./cityRenderer.js";
import { buildStaticColliders, resolveEntityCollisions } from "./physics.js";
import { Player } from "./player.js";
import { spawnTejgaonTraffic } from "./vehicles.js";

const canvas = document.getElementById("cityCanvas");
const ctx = canvas.getContext("2d");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");

const zoneLabel = document.getElementById("zoneLabel");
const coordLabel = document.getElementById("coordLabel");
const zoomLabel = document.getElementById("zoomLabel");
const speedLabel = document.getElementById("speedLabel");
const healthBar = document.getElementById("healthBar");
const staminaBar = document.getElementById("staminaBar");
const vehicleStatus = document.getElementById("vehicleStatus");

const renderer = new CityRenderer();
const colliders = buildStaticColliders(renderer.urbanFill.blocks);
const player = new Player(MAP_CONFIG.spawn.x, MAP_CONFIG.spawn.y);
const vehicles = spawnTejgaonTraffic();

const camera = {
  x: player.x,
  y: player.y,
  zoom: 0.95,
  freePan: false
};

const keys = new Set();
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let touchVec = { x: 0, y: 0 };
let mobileSprint = false;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Keyboard input
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (!keys.has(k) && (k === "f" || e.code === "Enter")) {
    player.tryToggleVehicle(vehicles);
    camera.freePan = false;
  }

  keys.add(k);

  if (e.code === "Space") {
    camera.freePan = false;
  } else if (k === "=" || k === "+") {
    camera.zoom = Math.min(2.2, camera.zoom + 0.12);
  } else if (k === "-" || k === "_") {
    camera.zoom = Math.max(0.35, camera.zoom - 0.12);
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
    camera.zoom = Math.max(0.35, Math.min(2.2, camera.zoom * factor));
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

// Mobile Touch Joystick & Action Buttons
const touchZone = document.getElementById("touchZone");
const touchKnob = document.getElementById("touchKnob");
const btnSprint = document.getElementById("btnSprint");
const btnEnterExit = document.getElementById("btnEnterExit");

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

btnSprint.addEventListener("touchstart", (e) => {
  e.preventDefault();
  mobileSprint = true;
});
btnSprint.addEventListener("touchend", () => {
  mobileSprint = false;
});
btnEnterExit.addEventListener("click", () => {
  player.tryToggleVehicle(vehicles);
  camera.freePan = false;
});

function gatherInput() {
  let moveX = touchVec.x;
  let moveY = touchVec.y;
  if (keys.has("w") || keys.has("arrowup")) moveY -= 1;
  if (keys.has("s") || keys.has("arrowdown")) moveY += 1;
  if (keys.has("a") || keys.has("arrowleft")) moveX -= 1;
  if (keys.has("d") || keys.has("arrowright")) moveX += 1;

  return {
    moveX,
    moveY,
    sprint: keys.has("shift") || mobileSprint
  };
}

function updateHUD() {
  const { minLat, maxLat, minLng, maxLng } = MAP_CONFIG.bounds;
  const lat = maxLat - (player.y / MAP_CONFIG.height) * (maxLat - minLat);
  const lng = minLng + (player.x / MAP_CONFIG.width) * (maxLng - minLng);
  coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
  zoomLabel.textContent = `${camera.zoom.toFixed(2)}x`;

  healthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
  staminaBar.style.width = `${(player.stamina / player.maxStamina) * 100}%`;

  if (player.inVehicle) {
    const kmh = Math.round(Math.abs(player.inVehicle.speed) * 0.22);
    speedLabel.textContent = `${kmh} KM/H`;
    vehicleStatus.textContent = `DRIVING: ${player.inVehicle.name}`;
    vehicleStatus.classList.add("driving");
  } else {
    speedLabel.textContent = "ON FOOT";
    vehicleStatus.textContent = "ON FOOT • Press [F] near vehicle";
    vehicleStatus.classList.remove("driving");
  }

  let currentZone = "Tejgaon Sector (Dhaka)";
  for (const z of ZONES) {
    if (
      player.x >= z.x &&
      player.x <= z.x + z.w &&
      player.y >= z.y &&
      player.y <= z.y + z.h
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

  const input = gatherInput();

  // Update vehicles first so player stays locked to vehicle coordinates when driving
  for (const v of vehicles) {
    v.update(dt, input, colliders, vehicles);
  }

  player.update(dt, input, colliders);
  resolveEntityCollisions(player, vehicles);

  if (input.moveX !== 0 || input.moveY !== 0) {
    camera.freePan = false;
  }

  if (!camera.freePan) {
    // Dynamic camera lead when driving fast
    const leadX = player.inVehicle ? player.inVehicle.vx * 0.22 : 0;
    const leadY = player.inVehicle ? player.inVehicle.vy * 0.22 : 0;
    camera.x += (player.x + leadX - camera.x) * 8 * dt;
    camera.y += (player.y + leadY - camera.y) * 8 * dt;
  }

  renderer.renderWorld(ctx, camera, player, vehicles);
  renderer.renderMinimap(minimapCtx, camera, player, vehicles);
  updateHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
