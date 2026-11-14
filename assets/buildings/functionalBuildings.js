/**
 * Functional Interactive Buildings System for DHAKA '96 (Tejgaon Sector)
 *
 * Makes buildings interactive and playable like classic GTA:
 *   1. Hotel Niribili (Safehouse)         -> [E] Rest, Restore 100% HP & Stamina, Save Progress
 *   2. Tejgaon Auto Workshop (Pay'n'Spray) -> [E] Repair Vehicle & Fresh 90s Dhaka Respray
 *   3. Dhaka Care Clinic & Pharmacy        -> [E] Emergency Medical Heal (100% HP + Stamina)
 *   4. Kawran Bazar Wholesale & Cha Stall  -> [E] Collect BDT Cash & 20s Unlimited Stamina Surge
 *   5. Tejgaon Railway Station             -> [E] Commuter Rail Fast-Transit across Tejgaon
 */
import * as THREE from "three";
import { ROADS, RAILWAY_LINE, LANDMARKS } from "../../js/tejgaonMapData.js";

const STORAGE_KEY = "dhaka96_tejgaon_save_v1";

const RESPRAY_PALETTE = [
  { name: "Emerald Green", body: 0x047857, roof: 0x065f46 },
  { name: "Dhaka Taxi Yellow", body: 0xeab308, roof: 0x1e293b },
  { name: "Royal Blue Metallic", body: 0x1d4ed8, roof: 0x1e3a8a },
  { name: "Crimson Red", body: 0xb91c1c, roof: 0x7f1d1d },
  { name: "Pearl Silver", body: 0xcbd5e1, roof: 0x64748b },
  { name: "Midnight Black", body: 0x18181b, roof: 0x09090b }
];

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function isFootprintClear(x, y, w, h) {
  const cx = x + w / 2;
  const cz = y + h / 2;
  const pad = Math.max(w, h) * 0.55 + 14;

  for (const road of ROADS) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const p1 = road.points[i];
      const p2 = road.points[i + 1];
      if (distToSegment(cx, cz, p1.x, p1.y, p2.x, p2.y) < road.width / 2 + pad) {
        return false;
      }
    }
  }
  for (let i = 0; i < RAILWAY_LINE.points.length - 1; i++) {
    const p1 = RAILWAY_LINE.points[i];
    const p2 = RAILWAY_LINE.points[i + 1];
    if (distToSegment(cx, cz, p1.x, p1.y, p2.x, p2.y) < 12 + pad) {
      return false;
    }
  }
  for (const lm of LANDMARKS) {
    if (
      x - 10 < lm.x + lm.w &&
      x + w + 10 > lm.x &&
      y - 10 < lm.y + lm.h &&
      y + h + 10 > lm.y
    ) {
      return false;
    }
  }
  return true;
}

function findSafeParcel(targetX, targetY, w, h) {
  if (isFootprintClear(targetX, targetY, w, h)) {
    return { x: targetX, y: targetY };
  }
  for (let radius = 16; radius <= 180; radius += 16) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const tx = Math.round(targetX + Math.cos(a) * radius);
      const ty = Math.round(targetY + Math.sin(a) * radius);
      if (tx > 70 && ty > 70 && tx < 1950 && ty < 1950 && isFootprintClear(tx, ty, w, h)) {
        return { x: tx, y: ty };
      }
    }
  }
  return { x: targetX, y: targetY };
}

/**
 * Resolves the 3 dedicated functional buildings in Tejgaon (Safehouse, Auto Workshop, Clinic)
 */
export function getFunctionalBuildings() {
  const safePos = findSafeParcel(1140, 1110, 22, 18);
  const workPos = findSafeParcel(1340, 960, 26, 20);
  const clinicPos = findSafeParcel(920, 1280, 22, 18);

  return [
    {
      id: "safehouse_niribili",
      role: "safehouse",
      name: "HOTEL NIRIBILI // SAFEHOUSE",
      x: safePos.x,
      y: safePos.y,
      w: 22,
      h: 18,
      color: 0x22c55e,
      actionRadius: 6.5,
      prompt: "Press [E] to Rest, Heal & Save Game"
    },
    {
      id: "workshop_tejgaon",
      role: "workshop",
      name: "TEJGAON AUTO WORKSHOP",
      x: workPos.x,
      y: workPos.y,
      w: 26,
      h: 20,
      color: 0x38bdf8,
      actionRadius: 8.5,
      prompt: "Press [E] to Repair & Respray Vehicle"
    },
    {
      id: "clinic_dhaka",
      role: "clinic",
      name: "DHAKA CARE CLINIC",
      x: clinicPos.x,
      y: clinicPos.y,
      w: 22,
      h: 18,
      color: 0xef4444,
      actionRadius: 6.5,
      prompt: "Press [E] for Medical Treatment (Full HP)"
    }
  ];
}

/**
 * Returns solid AABB colliders for the dedicated functional buildings
 */
export function getFunctionalBuildingColliders() {
  return getFunctionalBuildings().map((fb) => ({
    x: fb.x,
    y: fb.y,
    w: fb.w,
    h: fb.h,
    label: fb.name
  }));
}

/**
 * Manages 3D entrance markers, HUD action prompts, keyboard [E] & mobile button triggers,
 * and persistent save/load for functional buildings.
 */
export class FunctionalBuildingManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = getFunctionalBuildings();
    this.zones = [];
    this.activeZone = null;
    this.cashBDT = 1500;
    this.staminaBoostTimer = 0;
    this.resprayIndex = 0;
    this._ePressed = false;
    this._toastTimer = null;

    this.buildZones();
    this.setupHUD();
    this.bindInputs();
    this.loadSavedState();
  }

  buildZones() {
    // 1. Dedicated functional buildings (entrance ring at South face + 4m)
    for (const fb of this.buildings) {
      this.registerZone({
        id: fb.id,
        role: fb.role,
        title: fb.name,
        x: fb.x + fb.w / 2,
        z: fb.y + fb.h + 4.0,
        radius: fb.actionRadius,
        color: fb.color,
        prompt: fb.prompt
      });
    }

    // 2. Attach functional triggers to existing Tejgaon landmarks (Railway Station & Kawran Bazar)
    for (const lm of LANDMARKS) {
      if (lm.style === "station") {
        this.registerZone({
          id: "station_transit",
          role: "transit",
          title: lm.name,
          x: lm.x - 4.5,
          z: lm.y + lm.h / 2,
          radius: 7.5,
          color: 0xfacc15,
          prompt: "Press [E] to Board Commuter Rail (Fast Transit)"
        });
      } else if (lm.style === "market") {
        this.registerZone({
          id: "kawran_bazaar_stall",
          role: "bazaar",
          title: lm.name,
          x: lm.x + lm.w / 2,
          z: lm.y + lm.h + 4.5,
          radius: 7.5,
          color: 0xf59e0b,
          prompt: "Press [E] for Hot Cha & Bazaar Earnings (+৳500)"
        });
      }
    }
  }

  registerZone(zone) {
    const ringGeo = new THREE.RingGeometry(1.4, 1.9, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: zone.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(zone.x, 0.3, zone.z);
    this.scene.add(ring);

    const beamGeo = new THREE.CylinderGeometry(0.18, 0.65, 4.2, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: zone.color,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(zone.x, 2.3, zone.z);
    this.scene.add(beam);

    this.zones.push({ ...zone, ring, beam });
  }

  setupHUD() {
    // Cash / Status readout inside top-left HUD
    const topLeft = document.querySelector(".hud-top-left");
    if (topLeft && !document.getElementById("cashLabel")) {
      const cashEl = document.createElement("div");
      cashEl.id = "cashLabel";
      cashEl.style.cssText =
        "margin-top:6px;font-family:Consolas,monospace;font-size:12px;font-weight:700;color:#4ade80;letter-spacing:0.5px;";
      cashEl.textContent = `৳ ${this.cashBDT.toLocaleString()} BDT`;
      topLeft.appendChild(cashEl);
    }

    // Center-bottom GTA interaction prompt & toast banner
    if (!document.getElementById("buildingActionPrompt")) {
      const promptEl = document.createElement("div");
      promptEl.id = "buildingActionPrompt";
      promptEl.style.cssText =
        "position:fixed;bottom:84px;left:50%;transform:translateX(-50%);padding:10px 18px;" +
        "background:rgba(13,17,23,0.92);border:1px solid #f59e0b;border-radius:8px;" +
        "color:#f8fafc;font-family:Consolas,monospace;font-size:13px;font-weight:700;" +
        "letter-spacing:0.4px;box-shadow:0 8px 24px rgba(0,0,0,0.55);z-index:30;display:none;pointer-events:none;";
      document.body.appendChild(promptEl);
    }

    if (!document.getElementById("buildingToastBanner")) {
      const toastEl = document.createElement("div");
      toastEl.id = "buildingToastBanner";
      toastEl.style.cssText =
        "position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:12px 22px;" +
        "background:rgba(13,17,23,0.94);border:1px solid #38bdf8;border-radius:8px;" +
        "color:#facc15;font-family:Consolas,monospace;font-size:14px;font-weight:700;" +
        "text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.65);z-index:40;display:none;pointer-events:none;";
      document.body.appendChild(toastEl);
    }

    // Mobile [E] ACT button
    const mobileActions = document.querySelector(".mobile-actions");
    if (mobileActions && !document.getElementById("btnBuildingAct")) {
      const btn = document.createElement("button");
      btn.id = "btnBuildingAct";
      btn.className = "mobile-btn";
      btn.type = "button";
      btn.textContent = "ACT [E]";
      btn.style.display = "none";
      btn.addEventListener("click", () => {
        this._ePressed = true;
      });
      mobileActions.prepend(btn);
    }
  }

  bindInputs() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyE" && !e.repeat) {
        this._ePressed = true;
      }
    });
  }

  loadSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.cashBDT === "number") {
        this.cashBDT = saved.cashBDT;
        this.updateCashHUD();
      }
    } catch {
      // Ignore storage restrictions
    }
  }

  updateCashHUD() {
    const el = document.getElementById("cashLabel");
    if (el) {
      el.textContent = `৳ ${this.cashBDT.toLocaleString()} BDT${
        this.staminaBoostTimer > 0 ? ` • CHA BOOST ${Math.ceil(this.staminaBoostTimer)}s` : ""
      }`;
    }
  }

  showToast(title, subtitle = "") {
    const toast = document.getElementById("buildingToastBanner");
    if (!toast) return;
    toast.innerHTML = subtitle
      ? `<div>${title}</div><div style="font-size:11px;color:#cbd5e1;margin-top:4px;">${subtitle}</div>`
      : title;
    toast.style.display = "block";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.display = "none";
    }, 3400);
  }

  triggerZoneAction(zone, player, vehicles, vehicleMeshes) {
    if (zone.role === "safehouse") {
      player.health = 100;
      player.stamina = 100;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            x: Math.round(player.x),
            y: Math.round(player.y),
            health: player.health,
            cashBDT: this.cashBDT,
            savedAt: Date.now()
          })
        );
      } catch {
        // Ignore storage error
      }
      this.showToast("SAFEHOUSE RESTED & SAVED", "HP & Stamina 100% Restored • Progress Saved");
      return;
    }

    if (zone.role === "workshop") {
      // Find player's active vehicle or closest vehicle within 12m
      let targetVehicle = player.inVehicle ? player.currentVehicle : null;
      if (!targetVehicle) {
        let best = 12;
        for (const v of vehicles) {
          const d = Math.hypot(v.x - zone.x, v.y - zone.z);
          if (d < best) {
            best = d;
            targetVehicle = v;
          }
        }
      }

      if (!targetVehicle) {
        this.showToast("NO VEHICLE IN BAY", "Drive or park any vehicle near the workshop entrance");
        return;
      }

      const paint = RESPRAY_PALETTE[this.resprayIndex % RESPRAY_PALETTE.length];
      this.resprayIndex++;
      targetVehicle.bodyColor = paint.body;
      targetVehicle.roofColor = paint.roof;
      if (typeof targetVehicle.health === "number") targetVehicle.health = 100;

      // Rebuild 3D vehicle mesh on next frame with fresh respray color
      const oldMesh = vehicleMeshes.get(targetVehicle);
      if (oldMesh) {
        this.scene.remove(oldMesh);
        vehicleMeshes.delete(targetVehicle);
      }

      this.showToast(
        `VEHICLE REPAIRED & RESPRAYED`,
        `Fresh Coat: ${paint.name} • Engine Tuned 100%`
      );
      return;
    }

    if (zone.role === "clinic") {
      player.health = 100;
      player.stamina = 100;
      this.showToast("DHAKA CARE CLINIC", "Full Medical Treatment Complete • HP 100%");
      return;
    }

    if (zone.role === "bazaar") {
      this.cashBDT += 500;
      this.staminaBoostTimer = 20;
      player.stamina = 100;
      this.updateCashHUD();
      this.showToast(
        "KAWRAN BAZAR CHA & COLLECTION",
        "+৳500 BDT Collected • 20s Unlimited Stamina Surge!"
      );
      return;
    }

    if (zone.role === "transit") {
      if (player.inVehicle) {
        this.showToast("EXIT VEHICLE FIRST", "Step out of your vehicle to board the commuter train");
        return;
      }
      // Fast-transit between North Tejgaon Station & South Kawran Bazar Rail Crossing
      const goingSouth = player.y < 1200;
      player.x = goingSouth ? 1165 : zone.x;
      player.y = goingSouth ? 1560 : zone.z;
      this.showToast(
        "BANGLADESH RAILWAY EXPRESS",
        goingSouth ? "Arrived at Kawran Bazar Rail Crossing" : "Arrived at Tejgaon Railway Station"
      );
    }
  }

  update(player, vehicles, vehicleMeshes, elapsed, dt = 0.016) {
    if (this.staminaBoostTimer > 0) {
      this.staminaBoostTimer = Math.max(0, this.staminaBoostTimer - dt);
      player.stamina = 100;
      if (Math.floor(elapsed * 2) !== Math.floor((elapsed - dt) * 2)) {
        this.updateCashHUD();
      }
    }

    const px = player.inVehicle && player.currentVehicle ? player.currentVehicle.x : player.x;
    const pz = player.inVehicle && player.currentVehicle ? player.currentVehicle.y : player.y;

    let closest = null;
    let closestDist = Infinity;

    for (const z of this.zones) {
      const dx = px - z.x;
      const dz = pz - z.z;
      const distSq = dx * dx + dz * dz;

      // Distance cull marker animation beyond 160m
      const inRange = distSq < 160 * 160;
      z.ring.visible = inRange;
      z.beam.visible = inRange;

      if (inRange) {
        const pulse = 1 + Math.sin(elapsed * 4.5) * 0.08;
        z.ring.scale.set(pulse, pulse, 1);
        z.beam.rotation.y = elapsed * 1.4;
      }

      if (distSq <= z.radius * z.radius && distSq < closestDist) {
        closestDist = distSq;
        closest = z;
      }
    }

    this.activeZone = closest;

    const promptEl = document.getElementById("buildingActionPrompt");
    const mobileBtn = document.getElementById("btnBuildingAct");

    if (closest) {
      if (promptEl) {
        promptEl.textContent = `${closest.title} — ${closest.prompt}`;
        promptEl.style.display = "block";
      }
      if (mobileBtn) mobileBtn.style.display = "inline-block";

      if (this._ePressed) {
        this.triggerZoneAction(closest, player, vehicles, vehicleMeshes);
      }
    } else {
      if (promptEl) promptEl.style.display = "none";
      if (mobileBtn) mobileBtn.style.display = "none";
    }

    this._ePressed = false;
  }
}
