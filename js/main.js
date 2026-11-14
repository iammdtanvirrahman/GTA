import { MAP_CONFIG, ZONES } from "./tejgaonMapData.js";
import { City3DRenderer, generateUrbanLayout } from "./city3dRenderer.js";
import { buildStaticColliders, resolveEntityCollisions } from "./physics.js";
import { Player } from "./player.js";
import { spawnTejgaonTraffic } from "./vehicles.js";

const canvas = document.getElementById("cityCanvas");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");

const zoneLabel = document.getElementById("zoneLabel");
const coordLabel = document.getElementById("coordLabel");
const camModeLabel = document.getElementById("camModeLabel");
const speedLabel = document.getElementById("speedLabel");
const healthBar = document.getElementById("healthBar");
const staminaBar = document.getElementById("staminaBar");
const vehicleStatus = document.getElementById("vehicleStatus");

const urbanLayout = generateUrbanLayout();
const renderer3D = new City3DRenderer(canvas, urbanLayout);
const colliders = buildStaticColliders(urbanLayout.blocks);
const player = new Player(MAP_CONFIG.spawn.x, MAP_CONFIG.spawn.y);
const vehicles = spawnTejgaonTraffic();

// Real-life 1:1 metric camera distances (in meters)
const CAM_MODES = [
  { name: "CHASE 3D", distance: 18, pitch: 0.42, autoAlign: true },
  { name: "STREET VIEW", distance: 7.5, pitch: 0.24, autoAlign: true },
  { name: "TOP-DOWN 3D", distance: 68, pitch: 1.32, autoAlign: false }
];
let camModeIdx = 0;

const cameraState = {
  targetX: player.x,
  targetZ: player.y,
  distance: CAM_MODES[0].distance,
  pitch: CAM_MODES[0].pitch,
  yaw: player.angle,
  manualOrbit: false
};

const keys = new Set();
let isOrbiting = false;
let dragStart = { x: 0, y: 0 };
let touchVec = { x: 0, y: 0 };
let mobileSprint = false;

window.addEventListener("resize", () => renderer3D.resize());

function cycleCameraMode() {
  camModeIdx = (camModeIdx + 1) % CAM_MODES.length;
  const preset = CAM_MODES[camModeIdx];
  cameraState.distance = preset.distance;
  cameraState.pitch = preset.pitch;
  cameraState.manualOrbit = false;
  if (!preset.autoAlign) {
    cameraState.yaw = -Math.PI / 2;
  }
  camModeLabel.textContent = `CAM: ${preset.name}`;
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (!keys.has(k)) {
    if (k === "f" || e.code === "Enter") {
      player.tryToggleVehicle(vehicles);
    } else if (k === "c") {
      cycleCameraMode();
    } else if (e.code === "Space") {
      const preset = CAM_MODES[camModeIdx];
      cameraState.distance = preset.distance;
      cameraState.pitch = preset.pitch;
      cameraState.manualOrbit = false;
      cameraState.yaw = preset.autoAlign ? player.angle : -Math.PI / 2;
    }
  }

  keys.add(k);

  if (k === "=" || k === "+") {
    cameraState.distance = Math.max(4, cameraState.distance - 3);
  } else if (k === "-" || k === "_") {
    cameraState.distance = Math.min(260, cameraState.distance + 3);
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

// Mouse wheel zoom (4m close-up up to 260m aerial view)
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 0.89;
    cameraState.distance = Math.max(4, Math.min(260, cameraState.distance * factor));
  },
  { passive: false }
);

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 2 || e.button === 0 || e.button === 1) {
    isOrbiting = true;
    cameraState.manualOrbit = true;
    dragStart = { x: e.clientX, y: e.clientY };
  }
});

window.addEventListener("mousemove", (e) => {
  if (!isOrbiting) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  cameraState.yaw += dx * 0.0065;
  cameraState.pitch = Math.max(0.12, Math.min(1.45, cameraState.pitch + dy * 0.005));
  dragStart = { x: e.clientX, y: e.clientY };
});

window.addEventListener("mouseup", () => {
  isOrbiting = false;
});

// Mobile Touch Joystick & Action Buttons
const touchZone = document.getElementById("touchZone");
const touchKnob = document.getElementById("touchKnob");
const btnCam = document.getElementById("btnCam");
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

btnCam.addEventListener("click", cycleCameraMode);
btnSprint.addEventListener("touchstart", (e) => {
  e.preventDefault();
  mobileSprint = true;
});
btnSprint.addEventListener("touchend", () => {
  mobileSprint = false;
});
btnEnterExit.addEventListener("click", () => {
  player.tryToggleVehicle(vehicles);
});

function gatherInput() {
  let rawX = touchVec.x;
  let rawY = touchVec.y;
  if (keys.has("w") || keys.has("arrowup")) rawY -= 1;
  if (keys.has("s") || keys.has("arrowdown")) rawY += 1;
  if (keys.has("a") || keys.has("arrowleft")) rawX -= 1;
  if (keys.has("d") || keys.has("arrowright")) rawX += 1;

  if (player.inVehicle) {
    return {
      moveX: rawX,
      moveY: rawY,
      sprint: keys.has("shift") || mobileSprint
    };
  }

  if (rawX === 0 && rawY === 0) {
    return { moveX: 0, moveY: 0, sprint: keys.has("shift") || mobileSprint };
  }

  const forward = -rawY;
  const strafe = rawX;
  const fx = Math.cos(cameraState.yaw);
  const fy = Math.sin(cameraState.yaw);
  const rx = -fy;
  const ry = fx;

  return {
    moveX: fx * forward + rx * strafe,
    moveY: fy * forward + ry * strafe,
    sprint: keys.has("shift") || mobileSprint
  };
}

function updateHUD() {
  const { minLat, maxLat, minLng, maxLng } = MAP_CONFIG.bounds;
  const lat = maxLat - (player.y / MAP_CONFIG.height) * (maxLat - minLat);
  const lng = minLng + (player.x / MAP_CONFIG.width) * (maxLng - minLng);
  coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

  healthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
  staminaBar.style.width = `${(player.stamina / player.maxStamina) * 100}%`;

  if (player.inVehicle) {
    // True metric conversion: 1 m/s = 3.6 km/h
    const kmh = Math.round(Math.abs(player.inVehicle.speed) * 3.6);
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
  const elapsed = now * 0.001;

  const input = gatherInput();

  for (const v of vehicles) {
    v.update(dt, input, colliders, vehicles);
  }

  player.update(dt, input, colliders);
  resolveEntityCollisions(player, vehicles);

  const leadX = player.inVehicle ? player.inVehicle.vx * 0.16 : 0;
  const leadZ = player.inVehicle ? player.inVehicle.vy * 0.16 : 0;
  cameraState.targetX += (player.x + leadX - cameraState.targetX) * 10 * dt;
  cameraState.targetZ += (player.y + leadZ - cameraState.targetZ) * 10 * dt;

  const preset = CAM_MODES[camModeIdx];
  if (preset.autoAlign && player.inVehicle && !isOrbiting && !cameraState.manualOrbit) {
    let diff = player.inVehicle.angle - cameraState.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cameraState.yaw += diff * 3.5 * dt;
  }

  renderer3D.renderWorld(cameraState, player, vehicles, elapsed);
  renderer3D.renderMinimap(minimapCtx, player, vehicles);
  updateHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
