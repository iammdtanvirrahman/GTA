import { MAP_CONFIG, ZONES } from "./tejgaonMapData.js";
import { City3DRenderer, generateUrbanLayout } from "./city3dRenderer.js";
import { buildStaticColliders, resolveEntityCollisions } from "./physics.js";
import { Player } from "./player.js";
import { spawnTejgaonTraffic } from "./vehicles.js";
import { BangladeshRailwayTrain } from "./train.js";

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

const btnCinematicTour = document.getElementById("btnCinematicTour");
const btnFollowTrain = document.getElementById("btnFollowTrain");
const btnFollowTraffic = document.getElementById("btnFollowTraffic");
const btnFreeDrone = document.getElementById("btnFreeDrone");
const btnToggleMode = document.getElementById("btnToggleMode");
const landmarkPills = document.getElementById("landmarkPills");
const cinematicBanner = document.getElementById("cinematicBanner");
const cinematicShotTitle = document.getElementById("cinematicShotTitle");
const cinematicShotSub = document.getElementById("cinematicShotSub");

const urbanLayout = generateUrbanLayout();
const renderer3D = new City3DRenderer(canvas, urbanLayout);
const colliders = buildStaticColliders(urbanLayout.blocks);
const player = new Player(MAP_CONFIG.spawn.x, MAP_CONFIG.spawn.y);
const vehicles = spawnTejgaonTraffic();
const train = new BangladeshRailwayTrain();

// Curated Tejgaon 3D Spectator Viewpoints
const LANDMARK_VIEWS = [
  { name: "Shaheed Tajuddin Ave", x: 1495, z: 1420, altitude: 22, yaw: -0.75, pitch: 0.32 },
  { name: "Tejgaon Old Airport", x: 640, z: 760, altitude: 38, yaw: -1.35, pitch: 0.35 },
  { name: "Hatirjheel Overpass", x: 1930, z: 1125, altitude: 24, yaw: 0.35, pitch: 0.3 },
  { name: "Tejgaon Rail Station", x: 1205, z: 1560, altitude: 18, yaw: -0.45, pitch: 0.28 },
  { name: "Farmgate Commercial Hub", x: 615, z: 1580, altitude: 28, yaw: -0.85, pitch: 0.34 },
  { name: "Kawran Bazar Wholesale", x: 1010, z: 2230, altitude: 26, yaw: -1.1, pitch: 0.34 }
];

// Choreographed Automated Cinematic Flythrough Shots
const CINEMATIC_SHOTS = [
  {
    title: "SHAHEED TAJUDDIN AHMED AVE",
    subtitle: "Arterial corridor sweep • 1990s Dhaka traffic",
    duration: 11,
    evaluate(t) {
      return {
        camX: 1525 + Math.sin(t * Math.PI) * 28,
        camY: 20 + t * 8,
        camZ: 1680 - t * 440,
        lookX: 1475,
        lookY: 3.5,
        lookZ: 1480 - t * 440
      };
    }
  },
  {
    title: "BANGLADESH RAILWAY • TEJGAON LINE",
    subtitle: "Dynamic rail tracking • Class 2700 Diesel Express",
    duration: 12,
    evaluate(t) {
      const loco = train.locomotive;
      const sideAngle = loco.angle + Math.PI * 0.36;
      const orbitAngle = sideAngle + (t - 0.5) * 0.55;
      const radius = 34 - t * 6;
      return {
        camX: loco.x + Math.cos(orbitAngle) * radius,
        camY: 13 + Math.sin(t * Math.PI) * 6,
        camZ: loco.y + Math.sin(orbitAngle) * radius,
        lookX: loco.x - Math.cos(loco.angle) * 14,
        lookY: 2.8,
        lookZ: loco.y - Math.sin(loco.angle) * 14
      };
    }
  },
  {
    title: "HATIRJHEEL BOW-ARCH OVERPASS",
    subtitle: "Lakeside panorama & golden arch crossing",
    duration: 11,
    evaluate(t) {
      const ang = -0.35 + t * 0.95;
      return {
        camX: 1935 + Math.cos(ang) * 95,
        camY: 24 + Math.sin(t * Math.PI) * 10,
        camZ: 1135 + Math.sin(ang) * 95,
        lookX: 1930,
        lookY: 3.0,
        lookZ: 1125
      };
    }
  },
  {
    title: "TEJGAON OLD AIRPORT RUNWAY",
    subtitle: "Low-altitude runway pass toward control tower",
    duration: 11,
    evaluate(t) {
      return {
        camX: 625 + Math.sin(t * Math.PI) * 22,
        camY: 14 + t * 24,
        camZ: 980 - t * 460,
        lookX: 615,
        lookY: 6.0,
        lookZ: 740 - t * 460
      };
    }
  },
  {
    title: "FARMGATE COMMERCIAL HUB",
    subtitle: "Mid-rise canyon glide & busy junction",
    duration: 10,
    evaluate(t) {
      const ang = 0.6 + t * 0.85;
      return {
        camX: 610 + Math.cos(ang) * 85,
        camY: 26 + t * 10,
        camZ: 1585 + Math.sin(ang) * 85,
        lookX: 600,
        lookY: 5.0,
        lookZ: 1575
      };
    }
  },
  {
    title: "KAWRAN BAZAR WHOLESALE SECTOR",
    subtitle: "Southern market hub aerial sweep",
    duration: 10,
    evaluate(t) {
      const ang = -1.4 + t * 0.9;
      return {
        camX: 1015 + Math.cos(ang) * 90,
        camY: 25 + Math.sin(t * Math.PI) * 8,
        camZ: 2235 + Math.sin(ang) * 90,
        lookX: 1010,
        lookY: 4.5,
        lookZ: 2230
      };
    }
  },
  {
    title: "TEJGAON 3D SKYLINE PANORAMA",
    subtitle: "High-altitude sector overview • Dhaka 1996",
    duration: 12,
    evaluate(t) {
      const ang = -0.8 + t * 1.15;
      return {
        camX: 1240 + Math.cos(ang) * 340,
        camY: 112 + Math.sin(t * Math.PI) * 18,
        camZ: 1380 + Math.sin(ang) * 340,
        lookX: 1220,
        lookY: 8.0,
        lookZ: 1360
      };
    }
  }
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
  followVehicle: null,
  cinematic: {
    active: false,
    shotIndex: 0,
    timer: 0,
    camX: LANDMARK_VIEWS[0].x,
    camY: LANDMARK_VIEWS[0].altitude,
    camZ: LANDMARK_VIEWS[0].z,
    lookX: 1475,
    lookY: 4,
    lookZ: 1380
  }
};

// Real-life 1:1 metric camera distances (in meters) for Play Mode & AI/Train Follow
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

function stopCinematicTour(keepCameraPose = true) {
  if (!spectator.cinematic.active) return;
  const cin = spectator.cinematic;
  cin.active = false;
  if (keepCameraPose) {
    spectator.x = cin.camX;
    spectator.z = cin.camZ;
    spectator.altitude = Math.max(4, cin.camY);
    const dx = cin.lookX - cin.camX;
    const dy = cin.lookY - cin.camY;
    const dz = cin.lookZ - cin.camZ;
    const horiz = Math.max(0.01, Math.hypot(dx, dz));
    spectator.yaw = Math.atan2(dz, dx);
    spectator.pitch = Math.max(-1.2, Math.min(1.4, Math.atan2(-dy, horiz)));
  }
}

function toggleCinematicTour(forceState = null) {
  if (!spectator.active) {
    spectator.active = true;
  }
  const nextActive = forceState !== null ? forceState : !spectator.cinematic.active;
  if (nextActive) {
    spectator.followIndex = -1;
    spectator.followVehicle = null;
    spectator.cinematic.active = true;
    spectator.cinematic.shotIndex = 0;
    spectator.cinematic.timer = 0;
    const pose = CINEMATIC_SHOTS[0].evaluate(0);
    Object.assign(spectator.cinematic, pose);
  } else {
    stopCinematicTour(true);
  }
  syncSpectatorUI();
}

function advanceCinematicShot(step = 1) {
  if (!spectator.cinematic.active) {
    toggleCinematicTour(true);
    return;
  }
  const len = CINEMATIC_SHOTS.length;
  spectator.cinematic.shotIndex = (spectator.cinematic.shotIndex + step + len) % len;
  spectator.cinematic.timer = 0;
  syncSpectatorUI();
}

function setFreeDroneMode() {
  if (spectator.cinematic.active) {
    stopCinematicTour(true);
  } else if (spectator.followVehicle) {
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

function followTrainDirectly() {
  if (!spectator.active) {
    spectator.active = true;
  }
  stopCinematicTour(false);
  spectator.followIndex = 0;
  spectator.followVehicle = train.locomotive;
  cameraState.targetX = train.locomotive.x;
  cameraState.targetZ = train.locomotive.y;
  cameraState.yaw = train.locomotive.angle + 0.55;
  cameraState.distance = 36;
  cameraState.pitch = 0.34;
  cameraState.manualOrbit = false;
  syncSpectatorUI();
}

function cycleSpectateVehicle(step = 1) {
  if (!spectator.active) {
    spectator.active = true;
  }
  stopCinematicTour(false);

  // Pool starts with the Bangladesh Railway Express followed by active AI road vehicles
  const aiVehicles = vehicles.filter((v) => v.driver === "ai");
  const pool = [train.locomotive, ...aiVehicles];
  if (!pool.length) return;

  spectator.followIndex = (spectator.followIndex + step + pool.length) % pool.length;
  spectator.followVehicle = pool[spectator.followIndex];
  cameraState.targetX = spectator.followVehicle.x;
  cameraState.targetZ = spectator.followVehicle.y;
  cameraState.yaw = spectator.followVehicle.angle + (spectator.followVehicle.isTrain ? 0.55 : 0);
  cameraState.distance = spectator.followVehicle.isTrain ? 36 : 14;
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
  stopCinematicTour(false);
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
    const anchorX = player.inVehicle ? player.inVehicle.x : player.x;
    const anchorZ = player.inVehicle ? player.inVehicle.y : player.y;
    spectator.followIndex = -1;
    spectator.followVehicle = null;
    spectator.cinematic.active = false;
    spectator.x = anchorX - Math.cos(cameraState.yaw) * 16;
    spectator.z = anchorZ - Math.sin(cameraState.yaw) * 16;
    spectator.altitude = 18;
    spectator.yaw = cameraState.yaw;
    spectator.pitch = 0.34;
  } else {
    stopCinematicTour(true);
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
    btnCinematicTour.classList.remove("hidden");
    btnFollowTrain.classList.remove("hidden");
    btnFollowTraffic.classList.remove("hidden");
    btnFreeDrone.classList.remove("hidden");
    landmarkPills.classList.remove("hidden");
    btnToggleMode.textContent = "PLAY [V]";

    btnCinematicTour.classList.toggle("active", spectator.cinematic.active);
    btnFollowTrain.classList.toggle(
      "active",
      Boolean(spectator.followVehicle && spectator.followVehicle.isTrain)
    );
    btnFollowTraffic.classList.toggle(
      "active",
      Boolean(spectator.followVehicle && !spectator.followVehicle.isTrain)
    );
    btnFreeDrone.classList.toggle(
      "active",
      !spectator.cinematic.active && !spectator.followVehicle
    );

    if (spectator.cinematic.active) {
      const shotIdx = spectator.cinematic.shotIndex;
      const shot = CINEMATIC_SHOTS[shotIdx];
      hudBadge.textContent = "SPECTATOR // CINEMATIC TOUR";
      camModeLabel.textContent = `TOUR: ${shotIdx + 1}/${CINEMATIC_SHOTS.length}`;
      cinematicBanner.classList.remove("hidden");
      cinematicShotTitle.textContent = `SHOT 0${shotIdx + 1}/0${CINEMATIC_SHOTS.length} • ${shot.title}`;
      cinematicShotSub.textContent = `${shot.subtitle} • [N] Next Shot • [WASD/Drag] Take Control`;
    } else if (spectator.followVehicle) {
      cinematicBanner.classList.add("hidden");
      hudBadge.textContent = spectator.followVehicle.isTrain
        ? "SPECTATOR // RAIL CAM"
        : "SPECTATOR // FOLLOWING AI";
      camModeLabel.textContent = spectator.followVehicle.isTrain
        ? "CAM: BR TRAIN"
        : "CAM: AI FOLLOW";
    } else {
      cinematicBanner.classList.add("hidden");
      hudBadge.textContent = "SPECTATOR // FREE-CAM DRONE";
      camModeLabel.textContent = "CAM: FREE DRONE";
    }

    controlsLegend.innerHTML = `
      <div><kbd>WASD</kbd> / <kbd>Arrows</kbd> Fly &bull; <kbd>E</kbd>/<kbd>Q</kbd> Altitude &bull; <kbd>Shift</kbd> Boost</div>
      <div><kbd>G</kbd> Cinematic Flythrough (<kbd>N</kbd> Next) &bull; <kbd>Tab</kbd> Follow Train / AI</div>
      <div><kbd>Drag</kbd> Look 360° &bull; <kbd>Scroll</kbd> Zoom &bull; <kbd>1-6</kbd> Landmarks</div>
      <div><kbd>V</kbd> Switch Between Spectator &amp; Playable Mode</div>
    `;

    if (btnAltUp) btnAltUp.style.display = "inline-block";
    if (btnAltDown) btnAltDown.style.display = "inline-block";
    if (btnCam) btnCam.textContent = "TOUR [G]";
    if (btnSprint) btnSprint.textContent = "BOOST";
    if (btnEnterExit) btnEnterExit.textContent = "PLAY [V]";
  } else {
    cinematicBanner.classList.add("hidden");
    hudTopLeft.classList.add("play-mode");
    hudBadge.textContent = "3D ENGINE // PLAYABLE MODE";
    playerBars.classList.remove("hidden");
    btnCinematicTour.classList.add("hidden");
    btnFollowTrain.classList.add("hidden");
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
    toggleCinematicTour();
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
    } else if (k === "g") {
      toggleCinematicTour();
    } else if (k === "n" && spectator.active) {
      advanceCinematicShot(1);
    } else if (spectator.active && k >= "1" && k <= "6") {
      jumpToLandmark(Number(k) - 1);
    } else if (!spectator.active && (k === "f" || e.code === "Enter")) {
      player.tryToggleVehicle(vehicles);
    } else if (k === "c") {
      cycleCameraMode();
    } else if (e.code === "Space") {
      if (spectator.active) {
        if (spectator.cinematic.active || spectator.followVehicle) {
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
    if (spectator.active && !spectator.followVehicle && !spectator.cinematic.active) {
      spectator.altitude = Math.max(1.6, spectator.altitude - 6);
    } else {
      cameraState.distance = Math.max(4, cameraState.distance - 3);
    }
  } else if (k === "-" || k === "_") {
    if (spectator.active && !spectator.followVehicle && !spectator.cinematic.active) {
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
    if (spectator.cinematic.active) {
      setFreeDroneMode();
    }
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
    if (spectator.cinematic.active) {
      setFreeDroneMode();
    }
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
btnCinematicTour.addEventListener("click", () => toggleCinematicTour());
btnFollowTrain.addEventListener("click", followTrainDirectly);
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

function updateCinematicDirector(dt) {
  const cin = spectator.cinematic;
  const shot = CINEMATIC_SHOTS[cin.shotIndex];
  cin.timer += dt;

  if (cin.timer >= shot.duration) {
    cin.timer = 0;
    cin.shotIndex = (cin.shotIndex + 1) % CINEMATIC_SHOTS.length;
    syncSpectatorUI();
  }

  const activeShot = CINEMATIC_SHOTS[cin.shotIndex];
  const progress = Math.min(1, cin.timer / activeShot.duration);
  // Smooth cosine ease-in-out
  const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
  const targetPose = activeShot.evaluate(eased);

  const blend = Math.min(1, dt * 3.8);
  cin.camX += (targetPose.camX - cin.camX) * blend;
  cin.camY += (targetPose.camY - cin.camY) * blend;
  cin.camZ += (targetPose.camZ - cin.camZ) * blend;
  cin.lookX += (targetPose.lookX - cin.lookX) * blend;
  cin.lookY += (targetPose.lookY - cin.lookY) * blend;
  cin.lookZ += (targetPose.lookZ - cin.lookZ) * blend;
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

  // Manual flight input smoothly hands control back to Free-Cam Drone
  if ((spectator.cinematic.active || spectator.followVehicle) && (rawX !== 0 || rawY !== 0 || climb !== 0)) {
    setFreeDroneMode();
  }

  if (spectator.cinematic.active) {
    updateCinematicDirector(dt);
    return;
  }

  if (spectator.followVehicle) {
    const v = spectator.followVehicle;
    const leadX = v.vx * 0.16;
    const leadZ = v.vy * 0.16;
    cameraState.targetX += (v.x + leadX - cameraState.targetX) * 10 * dt;
    cameraState.targetZ += (v.y + leadZ - cameraState.targetZ) * 10 * dt;

    if (!isOrbiting && !cameraState.manualOrbit) {
      const desiredYaw = v.isTrain ? v.angle + 0.55 : v.angle;
      let diff = desiredYaw - cameraState.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cameraState.yaw += diff * 3.0 * dt;
    }
    return;
  }

  const boost = keys.has("shift") || mobileSprint;
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

function resolveTrainCrossings() {
  for (const car of train.cars) {
    const hitRadius = car.length * 0.45;
    if (!player.inVehicle) {
      const dx = player.x - car.x;
      const dy = player.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist < hitRadius && dist > 0.01) {
        player.x += (dx / dist) * (hitRadius - dist + 0.4);
        player.y += (dy / dist) * (hitRadius - dist + 0.4);
      }
    }
    for (const v of vehicles) {
      const dx = v.x - car.x;
      const dy = v.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist < hitRadius && dist > 0.01) {
        const push = hitRadius - dist + 0.5;
        v.x += (dx / dist) * push;
        v.y += (dy / dist) * push;
        v.vx += (dx / dist) * 8;
        v.vy += (dy / dist) * 8;
      }
    }
  }
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
    let worldX;
    let worldZ;
    if (spectator.cinematic.active) {
      worldX = spectator.cinematic.camX;
      worldZ = spectator.cinematic.camZ;
    } else if (spectator.followVehicle) {
      worldX = spectator.followVehicle.x;
      worldZ = spectator.followVehicle.y;
    } else {
      worldX = spectator.x;
      worldZ = spectator.z;
    }

    const lat = maxLat - (worldZ / MAP_CONFIG.height) * (maxLat - minLat);
    const lng = minLng + (worldX / MAP_CONFIG.width) * (maxLng - minLng);

    if (spectator.cinematic.active) {
      const alt = Math.round(spectator.cinematic.camY);
      coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E • ALT ${alt}M`;
      speedLabel.textContent = `ALT: ${alt}M`;
      vehicleStatus.textContent = `BR TRAIN: ${train.statusText}`;
    } else if (spectator.followVehicle) {
      const target = spectator.followVehicle;
      const kmh = Math.round(Math.abs(target.speed) * 3.6);
      coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E • LIVE TRACK`;
      speedLabel.textContent = `${kmh} KM/H`;
      vehicleStatus.textContent = target.isTrain
        ? `${target.name} • ${train.statusText}`
        : `SPECTATING: ${target.name}`;
    } else {
      const alt = Math.round(spectator.altitude);
      coordLabel.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E • ALT ${alt}M`;
      speedLabel.textContent = `ALT: ${alt}M`;
      vehicleStatus.textContent = `BR TRAIN: ${train.statusText}`;
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

  train.update(dt);
  for (const v of vehicles) {
    v.update(dt, input, colliders, vehicles);
  }

  if (spectator.active) {
    updateSpectator(dt);
  } else {
    player.update(dt, input, colliders);
    resolveEntityCollisions(player, vehicles);
    resolveTrainCrossings();

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

  renderer3D.renderWorld(cameraState, player, vehicles, elapsed, spectator, train);
  renderer3D.renderMinimap(minimapCtx, player, vehicles, spectator, train);
  updateHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
