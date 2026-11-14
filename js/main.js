import { MAP_CONFIG, ZONES } from "./tejgaonMapData.js";
import { City3DRenderer, generateUrbanLayout } from "./city3dRenderer.js";
import { buildStaticColliders, resolveEntityCollisions } from "./physics.js";
import { Player } from "./player.js";
import { spawnTejgaonTraffic } from "./vehicles.js";

const canvas = document.getElementById("cityCanvas");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");

const hudTopLeft = document.querySelector(".hud-top-left");
const hudBadge = document.getElementById("hudBadge");
const zoneLabel = document.getElementById("zoneLabel");
const coordLabel = document.getElementById("coordLabel");
const camModeLabel = document.getElementById("camModeLabel");
const speedLabel = document.getElementById("speedLabel");
const playerBars = document.getElementById("playerBars");
const healthBar = document.getElementById("healthBar");
const staminaBar = document.getElementById("staminaBar");
const vehicleStatus = document.getElementById("vehicleStatus");
const controlsLegend = document.getElementById("controlsLegend");

const btnFollowTraffic = document.getElementById("btnFollowTraffic");
const btnFreeDrone = document.getElementById("btnFreeDrone");
const btnToggleMode = document.getElementById("btnToggleMode");
const landmarkPills = document.getElementById("landmarkPills");

const urbanLayout = generateUrbanLayout();
const renderer3D = new City3DRenderer(canvas, urbanLayout);
const colliders = buildStaticColliders(urbanLayout.blocks);
const player = new Player(MAP_CONFIG.spawn.x, MAP_CONFIG.spawn.y);
const vehicles = spawnTejgaonTraffic();

// Curated Tejgaon 3D Spectator Viewpoints
const LANDMARK_VIEWS = [
  { name: "Shaheed Tajuddin Ave", x: 1495, z: 1420, altitude: 22, yaw: -0.75, pitch: 0.32 },
  { name: "Tejgaon Old Airport", x: 640, z: 760, altitude: 38, yaw: -1.35, pitch: 0.35 },
  { name: "Hatirjheel Overpass", x: 1930, z: 1125, altitude: 24, yaw: 0.35, pitch: 0.3 },
  { name: "Tejgaon Rail Station", x: 1205, z: 1560, altitude: 18, yaw: -0.45, pitch: 0.28 },
  { name: "Farmgate Commercial Hub", x: 615, z: 1580, altitude: 28, yaw: -0.85, pitch: 0.34 },
  { name: "Kawran Bazar Wholesale", x: 1010, z: 2230, altitude: 26, yaw: -1.1, pitch: 0.34 }
];

// System booted in Spectator Mode by default
const spectator = {
  active: true,
  x: LANDMARK_VIEWS[0].x,
  z: LANDMARK_VIEWS[0].z,
  altitude: LANDMARK_VIEWS[0].altitude,
  yaw: LANDMARK_VIEWS[0].yaw,
  pitch: LANDMARK_VIEWS[0].pitch,
  speed: 24,
  boostSpeed: 72,
  followIndex: -1,
  followVehicle: null
};

// Real-life 1:1 metric camera distances (in meters) for Play Mode & AI Vehicle Follow
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
let mobileAltDir = 0;

window.addEventListener("resize", () => renderer3D.resize());

function setFreeDroneMode() {
  if (spectator.followVehicle) {
    // Release smoothly at current vehicle position & elevation
    spectator.x = spectator.followVehicle.x - Math.cos(cameraState.yaw) * cameraState.distance;
    spectator.z = spectator.followVehicle.y - Math.sin(cameraState.yaw) * cameraState.distance;
    spectator.altitude = Math.max(8, cameraState.distance * Math.sin(cameraState.pitch));
    spectator.yaw = cameraState.yaw;
    spectator.pitch = cameraState.pitch;
  }
  spectator.followIndex = -1;
  spectator.followVehicle = null;
  syncSpectatorUI();
}

function cycleSpectateVehicle(step = 1) {
  if (!spectator.active) {
    spectator.active = true;
  }
  // Filter to active moving AI vehicles first so spectating traffic is lively
  const aiVehicles = vehicles.filter((v) => v.driver === "ai");
  const pool = aiVehicles.length > 0 ? aiVehicles : vehicles;
  if (!pool.length) return;

  spectator.followIndex = (spectator.followIndex + step + pool.length) % pool.length;
  spectator.followVehicle = pool[spectator.followIndex];
  cameraState.targetX = spectator.followVehicle.x;
  cameraState.targetZ = spectator.followVehicle.y;
  cameraState.yaw = spectator.followVehicle.angle;
  cameraState.distance = 14;
  cameraState.pitch = 0.36;
  cameraState.manualOrbit = false;
  syncSpectatorUI();
}

function jumpToLandmark(idx) {
  const view = LANDMARK_VIEWS[idx];
  if (!view) return;
  if (!spectator.active) {
    spectator.active = true;
  }
  spectator.followIndex = -1;
  spectator.followVehicle = null;
  spectator.x = view.x;
  spectator.z = view.z;
  spectator.altitude = view.altitude;
  spectator.yaw = view.yaw;
  spectator.pitch = view.pitch;
  syncSpectatorUI();
}

function toggleSpectatorMode() {
  spectator.active = !spectator.active;
  if (spectator.active) {
    // Enter Spectator Mode from current player/vehicle view
    const anchorX = player.inVehicle ? player.inVehicle.x : player.x;
    const anchorZ = player.inVehicle ? player.inVehicle.y : player.y;
    spectator.followIndex = -1;
    spectator.followVehicle = null;
    spectator.x = anchorX - Math.cos(cameraState.yaw) * 16;
    spectator.z = anchorZ - Math.sin(cameraState.yaw) * 16;
    spectator.altitude = 18;
    spectator.yaw = cameraState.yaw;
    spectator.pitch = 0.34;
  } else {
    // Enter Playable Mode at current spectator ground coordinates (clamped safely on map)
    spectator.followIndex = -1;
    spectator.followVehicle = null;
    if (!player.inVehicle) {
      player.x = Math.max(40, Math.min(MAP_CONFIG.width - 40, spectator.x));
      player.y = Math.max(40, Math.min(MAP_CONFIG.height - 40, spectator.z));
    }
    cameraState.targetX = player.x;
    cameraState.targetZ = player.y;
    cameraState.distance = CAM_MODES[camModeIdx].distance;
    cameraState.pitch = CAM_MODES[camModeIdx].pitch;
    cameraState.manualOrbit = false;
  }
  syncSpectatorUI();
}

function syncSpectatorUI() {
  const btnAltUp = document.getElementById("btnAltUp");
  const btnAltDown = document.getElementById("btnAltDown");
  const btnCam = document.getElementById("btnCam");
  const btnSprint = document.getElementById("btnSprint");
  const btnEnterExit = document.getElementById("btnEnterExit");

  if (spectator.active) {
    hudTopLeft.classList.remove("play-mode");
    playerBars.classList.add("hidden");
    btnFollowTraffic.classList.remove("hidden");
    btnFreeDrone.classList.remove("hidden");
    landmarkPills.classList.remove("hidden");
    btnToggleMode.textContent = "PLAY [V]";

    if (spectator.followVehicle) {
      hudBadge.textContent = "SPECTATOR // FOLLOWING AI";
      btnFollowTraffic.classList.add("active");
      btnFreeDrone.classList.remove("active");
      camModeLabel.textContent = "CAM: AI FOLLOW";
    } else {
      hudBadge.textContent = "SPECTATOR // FREE-CAM DRONE";
      btnFreeDrone.classList.add("active");
      btnFollowTraffic.classList.remove("active");
      camModeLabel.textContent = "CAM: FREE DRONE";
    }

    controlsLegend.innerHTML = `
      <div><kbd>WASD</kbd> / <kbd>Arrows</kbd> Fly &bull; <kbd>E</kbd>/<kbd>Q</kbd> Altitude &bull; <kbd>Shift</kbd> Boost</div>
      <div><kbd>Drag</kbd> Look 360° &bull; <kbd>Scroll</kbd> Zoom / Dolly &bull; <kbd>Space</kbd> Reset</div>
      <div><kbd>Tab</kbd> Spectate AI Vehicle &bull; <kbd>1-6</kbd> Jump Landmarks</div>
      <div><kbd>V</kbd> Switch Between Spectator &amp; Playable Mode</div>
    `;

    if (btnAltUp) btnAltUp.style.display = "inline-block";
    if (btnAltDown) btnAltDown.style.display = "inline-block";
    if (btnCam) btnCam.textContent = "FOLLOW AI";
    if (btnSprint) btnSprint.textContent = "BOOST";
    if (btnEnterExit) btnEnterExit.textContent = "PLAY [V]";
  } else {
    hudTopLeft.classList.add("play-mode");
    hudBadge.textContent = "3D ENGINE // PLAYABLE MODE";
    playerBars.classList.remove("hidden");
    btnFollowTraffic.classList.add("hidden");
    btnFreeDrone.classList.add("hidden");
    landmarkPills.classList.add("hidden");
    btnToggleMode.textContent = "SPECTATE [V]";
    camModeLabel.textContent = `CAM: ${CAM_MODES[camModeIdx].name}`;

    controlsLegend.innerHTML = `
      <div><kbd>WASD</kbd> / <kbd>Arrows</kbd> Move / Drive &bull; <kbd>Shift</kbd> Sprint / Brake</div>
      <div><kbd>F</kbd> / <kbd>Enter</kbd> Hijack or Exit Vehicle &bull; <kbd>E</kbd> Interact</div>
      <div><kbd>C</kbd> Camera View &bull; <kbd>Drag</kbd> Orbit &bull; <kbd>Scroll</kbd> Zoom</div>
      <div><kbd>V</kbd> Return to Spectator Mode</div>
    `;

    if (btnAltUp) btnAltUp.style.display = "none";
    if (btnAltDown) btnAltDown.style.display = "none";
    if (btnCam) btnCam.textContent = "CAM";
    if (btnSprint) btnSprint.textContent = "SPRINT";
    if (btnEnterExit) btnEnterExit.textContent = "ENTER / EXIT";
  }
}

function cycleCameraMode() {
  if (spectator.active) {
    cycleSpectateVehicle(1);
    return;
  }
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

  if (e.code === "Tab") {
    e.preventDefault();
    if (!e.repeat) {
      cycleSpectateVehicle(e.shiftKey ? -1 : 1);
    }
    return;
  }

  if (!keys.has(k)) {
    if (k === "v") {
      toggleSpectatorMode();
    } else if (spectator.active && k >= "1" && k <= "6") {
      jumpToLandmark(Number(k) - 1);
    } else if (!spectator.active && (k === "f" || e.code === "Enter")) {
      player.tryToggleVehicle(vehicles);
    } else if (k === "c") {
      cycleCameraMode();
    } else if (e.code === "Space") {
      if (spectator.active) {
        if (spectator.followVehicle) {
          setFreeDroneMode();
        } else {
          spectator.pitch = 0.34;
          spectator.altitude = 24;
        }
      } else {
        const preset = CAM_MODES[camModeIdx];
        cameraState.distance = preset.distance;
        cameraState.pitch = preset.pitch;
        cameraState.manualOrbit = false;
        cameraState.yaw = preset.autoAlign ? player.angle : -Math.PI / 2;
      }
    }
  }

  keys.add(k);

  if (k === "=" || k === "+") {
    if (spectator.active && !spectator.followVehicle) {
      spectator.altitude = Math.max(1.6, spectator.altitude - 6);
    } else {
      cameraState.distance = Math.max(4, cameraState.distance - 3);
    }
  } else if (k === "-" || k === "_") {
    if (spectator.active && !spectator.followVehicle) {
      spectator.altitude = Math.min(460, spectator.altitude + 6);
    } else {
      cameraState.distance = Math.min(260, cameraState.distance + 3);
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

// Mouse wheel zoom / drone dolly
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (spectator.active && !spectator.followVehicle) {
      const step = e.deltaY > 0 ? -12 : 12;
      spectator.x = Math.max(
        10,
        Math.min(MAP_CONFIG.width - 10, spectator.x + Math.cos(spectator.yaw) * step)
      );
      spectator.z = Math.max(
        10,
        Math.min(MAP_CONFIG.height - 10, spectator.z + Math.sin(spectator.yaw) * step)
      );
      spectator.altitude = Math.max(
        1.6,
        Math.min(460, spectator.altitude + (e.deltaY > 0 ? 4 : -4))
      );
      return;
    }
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

  if (spectator.active && !spectator.followVehicle) {
    spectator.yaw += dx * 0.0055;
    spectator.pitch = Math.max(-1.25, Math.min(1.42, spectator.pitch + dy * 0.0045));
  } else {
    cameraState.yaw += dx * 0.0065;
    cameraState.pitch = Math.max(0.12, Math.min(1.45, cameraState.pitch + dy * 0.005));
  }
  dragStart = { x: e.clientX, y: e.clientY };
});

window.addEventListener("mouseup", () => {
  isOrbiting = false;
});

// HUD Button Bindings
btnFollowTraffic.addEventListener("click", () => cycleSpectateVehicle(1));
btnFreeDrone.addEventListener("click", setFreeDroneMode);
btnToggleMode.addEventListener("click", toggleSpectatorMode);
landmarkPills.addEventListener("click", (e) => {
  const btn = e.target.closest(".lm-pill");
  if (!btn) return;
  jumpToLandmark(Number(btn.dataset.idx));
});

// Mobile Touch Joystick & Action Buttons
const touchZone = document.getElementById("touchZone");
const touchKnob = document.getElementById("touchKnob");
const btnCam = document.getElementById("btnCam");
const btnSprint = document.getElementById("btnSprint");
const btnEnterExit = document.getElementById("btnEnterExit");
const btnAltUp = document.getElementById("btnAltUp");
const btnAltDown = document.getElementById("btnAltDown");

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
  if (spectator.active) {
    toggleSpectatorMode();
  } else {
    player.tryToggleVehicle(vehicles);
  }
});

if (btnAltUp) {
  btnAltUp.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mobileAltDir = 1;
  });
  btnAltUp.addEventListener("touchend", () => {
    mobileAltDir = 0;
  });
}
if (btnAltDown) {
  btnAltDown.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mobileAltDir = -1;
  });
  btnAltDown.addEventListener("touchend", () => {
    mobileAltDir = 0;
  });
}

function updateSpectator(dt) {
  let rawX = touchVec.x;
  let rawY = touchVec.y;
  if (keys.has("w") || keys.has("arrowup")) rawY -= 1;
  if (keys.has("s") || keys.has("arrowdown")) rawY += 1;
  if (keys.has("a") || keys.has("arrowleft")) rawX -= 1;
  if (keys.has("d") || keys.has("arrowright")) rawX += 1;

  let climb = mobileAltDir;
  if (keys.has("e") || keys.has("pageup")) climb += 1;
  if (keys.has("q") || keys.has("pagedown") || keys.has("control")) climb -= 1;

  // If user presses flight keys while following a vehicle, detach cleanly into Free Drone
  if (spectator.followVehicle && (rawX !== 0 || rawY !== 0 || climb !== 0)) {
    setFreeDroneMode();
  }

  if (spectator.followVehicle) {
    const v = spectator.followVehicle;
    const leadX = v.vx * 0.16;
    const leadZ = v.vy * 0.16;
    cameraState.targetX += (v.x + leadX - cameraState.targetX) * 10 * dt;
    cameraState.targetZ += (v.y + leadZ - cameraState.targetZ) * 10 * dt;

    if (!isOrbiting && !cameraState.manualOrbit) {
      let diff = v.angle - cameraState.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cameraState.yaw += diff * 3.5 * dt;
    }
    return;
  }

  const boost = keys.has("shift") || mobileSprint;
  // Scale drone speed slightly with altitude for effortless map traversal
  const altScale = 1 + Math.min(2.5, spectator.altitude / 90);
  const moveSpeed = (boost ? spectator.boostSpeed : spectator.speed) * altScale;

  const forward = -rawY;
  const strafe = rawX;
  const fx = Math.cos(spectator.yaw);
  const fz = Math.sin(spectator.yaw);
  const rx = -fz;
  const rz = fx;

  let vx = fx * forward + rx * strafe;
  let vz = fz * forward + rz * strafe;
  const mag = Math.hypot(vx, vz);
  if (mag > 1) {
    vx /= mag;
    vz /= mag;
  }

  spectator.x = Math.max(
    10,
    Math.min(MAP_CONFIG.width - 10, spectator.x + vx * moveSpeed * dt)
  );
  spectator.z = Math.max(
    10,
    Math.min(MAP_CONFIG.height - 10, spectator.z + vz * moveSpeed * dt)
  );
  spectator.altitude = Math.max(
    1.6,
    Math.min(460, spectator.altitude + climb * moveSpeed * 0.75 * dt)
  );
}

function gatherInput() {
  if (spectator.active) {
    return { moveX: 0, moveY: 0, sprint: false };
  }

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

  if (spectator.active) {
    const target = spectator.followVehicle;
    const worldX = target ? target.x : spectator.x;
    const worldZ = target ? target.y : spectator.z;

    const lat = maxLat - (worldZ / MAP_CONFIG.height) * (maxLat - minLat);
    const lng = minLng + (worldX / MAP_CONFIG.width) * (maxLng - minLng);

    if (target) {
      const kmh = Math.round(Math.abs(target.speed) * 3.6);
      coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E • AI TRACK`;
      speedLabel.textContent = `${kmh} KM/H`;
      vehicleStatus.textContent = `SPECTATING: ${target.name}`;
    } else {
      const alt = Math.round(spectator.altitude);
      coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E • ALT ${alt}M`;
      speedLabel.textContent = `ALT: ${alt}M`;
      vehicleStatus.textContent = `FREE-CAM DRONE • [Tab] Follow AI`;
    }
    vehicleStatus.classList.add("driving");

    let currentZone = "Tejgaon Sector (Dhaka)";
    for (const z of ZONES) {
      if (
        worldX >= z.x &&
        worldX <= z.x + z.w &&
        worldZ >= z.y &&
        worldZ <= z.y + z.h
      ) {
        currentZone = z.name;
        break;
      }
    }
    zoneLabel.textContent = currentZone;
    return;
  }

  const lat = maxLat - (player.y / MAP_CONFIG.height) * (maxLat - minLat);
  const lng = minLng + (player.x / MAP_CONFIG.width) * (maxLng - minLng);
  coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

  healthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
  staminaBar.style.width = `${(player.stamina / player.maxStamina) * 100}%`;

  if (player.inVehicle) {
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

syncSpectatorUI();

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const elapsed = now * 0.001;

  const input = gatherInput();

  for (const v of vehicles) {
    v.update(dt, input, colliders, vehicles);
  }

  if (spectator.active) {
    updateSpectator(dt);
  } else {
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
  }

  renderer3D.renderWorld(cameraState, player, vehicles, elapsed, spectator);
  renderer3D.renderMinimap(minimapCtx, player, vehicles, spectator);
  updateHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
