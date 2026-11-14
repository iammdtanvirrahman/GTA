import { ROADS } from "./tejgaonMapData.js";
import { resolveWorldCollisions } from "./physics.js";

/**
 * Iconic 1990s Dhaka Vehicle Archetypes
 */
export const VEHICLE_SPECS = {
  mishuk: {
    id: "mishuk",
    name: "Mishuk Baby Taxi (2-Stroke)",
    length: 34,
    width: 20,
    radius: 15,
    maxSpeed: 310,
    reverseSpeed: -110,
    accel: 340,
    brake: 480,
    turnRate: 3.4,
    driftGrip: 0.91,
    bodyColor: "#16a34a", // Classic 90s green baby taxi
    roofColor: "#facc15", // Yellow hood top
    trimColor: "#111827"
  },
  rickshaw: {
    id: "rickshaw",
    name: "Dhaka Cycle Rickshaw",
    length: 36,
    width: 19,
    radius: 15,
    maxSpeed: 175,
    reverseSpeed: -65,
    accel: 210,
    brake: 360,
    turnRate: 3.8,
    driftGrip: 0.95,
    bodyColor: "#dc2626", // Painted tin body
    roofColor: "#38bdf8", // Vinyl hood
    trimColor: "#f59e0b"
  },
  corolla: {
    id: "corolla",
    name: "'92 Toyota Corolla DX",
    length: 46,
    width: 22,
    radius: 18,
    maxSpeed: 420,
    reverseSpeed: -150,
    accel: 390,
    brake: 560,
    turnRate: 2.8,
    driftGrip: 0.88,
    bodyColor: "#e2e8f0", // Iconic white 90s Dhaka sedan
    roofColor: "#cbd5e1",
    trimColor: "#1e293b"
  },
  brtc: {
    id: "brtc",
    name: "BRTC Double-Decker Bus",
    length: 76,
    width: 28,
    radius: 25,
    maxSpeed: 265,
    reverseSpeed: -95,
    accel: 200,
    brake: 340,
    turnRate: 1.75,
    driftGrip: 0.94,
    bodyColor: "#b91c1c", // Classic BRTC red
    roofColor: "#991b1b",
    trimColor: "#fbbf24"
  },
  police: {
    id: "police",
    name: "DMP Patrol Jeep",
    length: 44,
    width: 23,
    radius: 18,
    maxSpeed: 445,
    reverseSpeed: -160,
    accel: 430,
    brake: 600,
    turnRate: 3.0,
    driftGrip: 0.89,
    bodyColor: "#1e3a8a", // DMP dark blue
    roofColor: "#f8fafc",
    trimColor: "#ef4444"
  }
};

export class Vehicle {
  constructor(specKey, x, y, angle, route = null) {
    const spec = VEHICLE_SPECS[specKey] || VEHICLE_SPECS.corolla;
    Object.assign(this, spec);

    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.vx = 0;
    this.vy = 0;

    this.driver = "ai"; // "ai" | "player" | null
    this.route = route;
    this.waypointIdx = route ? route.startIdx : 0;
    this.routeDir = 1;
    this.sirenPhase = Math.random() * 10;
  }

  update(dt, input, colliders, allVehicles) {
    this.sirenPhase += dt * 10;
    const prevX = this.x;
    const prevY = this.y;

    if (this.driver === "player") {
      this.updatePlayerDrive(dt, input);
    } else if (this.driver === "ai" && this.route) {
      this.updateAIDrive(dt, allVehicles);
    } else {
      // Parked / coasting to stop
      this.speed *= Math.pow(0.15, dt);
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    const hitWall = resolveWorldCollisions(this, prevX, prevY, colliders);
    if (hitWall) {
      this.speed *= 0.45;
      if (this.driver === "ai") {
        // Nudge AI away from obstacle
        this.angle += 0.4;
      }
    }
  }

  updatePlayerDrive(dt, input) {
    // Forward / Reverse input (W/Up = -moveY)
    const throttle = -input.moveY;
    const steer = input.moveX;
    const handbrake = input.sprint;

    if (throttle > 0.05) {
      this.speed += throttle * this.accel * dt;
    } else if (throttle < -0.05) {
      if (this.speed > 20) {
        this.speed += throttle * this.brake * dt;
      } else {
        this.speed += throttle * (this.accel * 0.75) * dt;
      }
    } else {
      // Natural rolling drag
      this.speed *= Math.pow(0.28, dt);
      if (Math.abs(this.speed) < 3) this.speed = 0;
    }

    if (handbrake) {
      this.speed *= Math.pow(0.08, dt);
    }

    this.speed = Math.max(this.reverseSpeed, Math.min(this.maxSpeed, this.speed));

    // Steering scales with speed so cars don't spin in place when parked
    const speedFactor = Math.min(1, Math.abs(this.speed) / 95);
    const reverseSign = this.speed >= -1 ? 1 : -1;
    const turnMultiplier = handbrake ? 1.25 : 1.0;

    this.angle += steer * this.turnRate * speedFactor * reverseSign * turnMultiplier * dt;

    // Lateral velocity blending for subtle 90s drift feel
    const targetVx = Math.cos(this.angle) * this.speed;
    const targetVy = Math.sin(this.angle) * this.speed;
    const grip = handbrake ? 0.82 : this.driftGrip;
    const blend = 1 - Math.pow(1 - grip, dt * 60);

    this.vx += (targetVx - this.vx) * blend;
    this.vy += (targetVy - this.vy) * blend;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  updateAIDrive(dt, allVehicles) {
    const pts = this.route.points;
    const target = pts[this.waypointIdx];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 42) {
      this.waypointIdx += this.routeDir;
      if (this.waypointIdx >= pts.length) {
        this.waypointIdx = pts.length - 2;
        this.routeDir = -1;
      } else if (this.waypointIdx < 0) {
        this.waypointIdx = 1;
        this.routeDir = 1;
      }
    }

    const desiredAngle = Math.atan2(dy, dx);
    let angleDiff = desiredAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    this.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, angleDiff * 4.5 * dt));

    // Check ahead for traffic so AI brakes smoothly
    let blocked = false;
    const lookX = this.x + Math.cos(this.angle) * (this.length * 0.95 + 36);
    const lookY = this.y + Math.sin(this.angle) * (this.length * 0.95 + 36);

    for (const other of allVehicles) {
      if (other === this) continue;
      if (Math.hypot(other.x - lookX, other.y - lookY) < this.radius + other.radius + 14) {
        blocked = true;
        break;
      }
    }

    const cruiseSpeed = blocked ? 0 : this.maxSpeed * 0.56;
    if (this.speed < cruiseSpeed) {
      this.speed = Math.min(cruiseSpeed, this.speed + this.accel * 0.7 * dt);
    } else {
      this.speed = Math.max(cruiseSpeed, this.speed - this.brake * dt);
    }

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const hl = this.length / 2;
    const hw = this.width / 2;

    // Ground drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(-hl + 4, -hw + 5, this.length, this.width);

    // Tires (4 wheels)
    ctx.fillStyle = "#090d12";
    const wheelOffsets = [
      [-hl * 0.62, -hw - 2],
      [hl * 0.62, -hw - 2],
      [-hl * 0.62, hw - 1],
      [hl * 0.62, hw - 1]
    ];
    for (const [wx, wy] of wheelOffsets) {
      ctx.fillRect(wx - 4, wy, 8, 3);
    }

    // Main vehicle chassis
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-hl, -hw, this.length, this.width, 4);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#0d1117";
    ctx.stroke();

    // Vehicle-specific 90s Dhaka details
    if (this.id === "mishuk") {
      // Yellow baby-taxi passenger canopy + front handlebar fork
      ctx.fillStyle = this.roofColor;
      ctx.fillRect(-hl + 3, -hw + 2, this.length * 0.62, this.width - 4);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(hl - 9, -hw + 4, 5, this.width - 8);
    } else if (this.id === "rickshaw") {
      // Folded/raised colorful hood + puller seat
      ctx.fillStyle = this.roofColor;
      ctx.fillRect(-hl + 2, -hw + 2, this.length * 0.48, this.width - 4);
      ctx.strokeStyle = this.trimColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-hl + 2, -hw + 2, this.length * 0.48, this.width - 4);
      // Rickshaw puller head
      ctx.fillStyle = "#d99b66";
      ctx.beginPath();
      ctx.arc(hl * 0.35, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.id === "brtc") {
      // Double-decker roof ventilation hatches & yellow stripe
      ctx.fillStyle = this.trimColor;
      ctx.fillRect(-hl + 4, -hw + 1, this.length - 8, 2.5);
      ctx.fillRect(-hl + 4, hw - 3.5, this.length - 8, 2.5);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(-hl + 12, -hw + 5, this.length - 24, this.width - 10);
    } else {
      // Corolla DX & DMP Police Jeep cabin + windshield
      ctx.fillStyle = this.roofColor;
      ctx.fillRect(-hl * 0.55, -hw + 3, this.length * 0.55, this.width - 6);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(hl * 0.12, -hw + 3, 6, this.width - 6); // Front windshield
      ctx.fillRect(-hl * 0.68, -hw + 3, 4, this.width - 6); // Rear glass
    }

    // DMP Police Jeep flashing red/blue rooftop beacon
    if (this.id === "police") {
      const flash = Math.sin(this.sirenPhase) > 0;
      ctx.fillStyle = flash ? "#ef4444" : "#3b82f6";
      ctx.fillRect(-3, -6, 6, 5);
      ctx.fillStyle = flash ? "#3b82f6" : "#ef4444";
      ctx.fillRect(-3, 1, 6, 5);
    }

    // Headlights
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(hl - 2, -hw + 3, 2.5, 4);
    ctx.fillRect(hl - 2, hw - 7, 2.5, 4);

    // Brake / Taillights
    ctx.fillStyle = this.speed < 0 ? "#ffffff" : "#ef4444";
    ctx.fillRect(-hl, -hw + 3, 2, 4);
    ctx.fillRect(-hl, hw - 7, 2, 4);

    ctx.restore();
  }
}

/**
 * Spawns initial 90s Dhaka traffic across Tejgaon's roads plus parked vehicles near spawn.
 */
export function spawnTejgaonTraffic() {
  const vehicles = [];
  const types = ["mishuk", "rickshaw", "corolla", "brtc", "police"];

  // Spawn 3 guaranteed vehicles right near the player spawn on Shaheed Tajuddin Ahmed Ave
  vehicles.push(new Vehicle("mishuk", 2485, 2090, -Math.PI / 2, null));
  vehicles.push(new Vehicle("corolla", 2495, 2230, Math.PI / 2, null));
  vehicles.push(new Vehicle("rickshaw", 2475, 2320, -Math.PI / 2, null));

  // Populate AI traffic along major Tejgaon roads
  ROADS.forEach((road, rIdx) => {
    if (road.points.length < 2) return;
    const count = road.type === "arterial" ? 4 : 2;

    for (let i = 0; i < count; i++) {
      const segIdx = i % (road.points.length - 1);
      const p1 = road.points[segIdx];
      const p2 = road.points[segIdx + 1];
      const t = 0.25 + ((i * 0.37) % 0.55);

      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      // Keep BRTC buses on wide arterial roads
      let specKey = types[(rIdx + i) % types.length];
      if (specKey === "brtc" && road.type !== "arterial") {
        specKey = "mishuk";
      }

      const v = new Vehicle(specKey, x, y, angle, {
        points: road.points,
        startIdx: Math.min(road.points.length - 1, segIdx + 1)
      });
      vehicles.push(v);
    }
  });

  return vehicles;
}
