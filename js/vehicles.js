import { ROADS } from "./tejgaonMapData.js";
import { resolveWorldCollisions } from "./physics.js";

/**
 * Real-life 1:1 Metric 1990s Dhaka Vehicle Specifications (1 unit = 1.0 meter):
 *   - Mishuk Baby Taxi: 2.65m L x 1.35m W x 1.68m H (top speed ~60 km/h = 16.7 m/s)
 *   - Dhaka Cycle Rickshaw: 2.35m L x 1.15m W x 1.78m H (top speed ~22 km/h = 6.1 m/s)
 *   - '92 Toyota Corolla DX (EE90): 4.25m L x 1.68m W x 1.38m H (top speed ~135 km/h = 37.5 m/s)
 *   - BRTC Double-Decker Bus (Leyland): 11.20m L x 2.50m W x 4.35m H (top speed ~72 km/h = 20.0 m/s)
 *   - DMP Patrol Jeep (Mitsubishi/Isuzu): 4.35m L x 1.78m W x 1.88m H (top speed ~130 km/h = 36.1 m/s)
 */
export const VEHICLE_SPECS = {
  mishuk: {
    id: "mishuk",
    name: "Mishuk Baby Taxi (2-Stroke)",
    length: 2.65,
    width: 1.35,
    height: 1.68,
    radius: 1.05,
    maxSpeed: 16.8, // ~60 km/h
    reverseSpeed: -5.5,
    accel: 6.2,
    brake: 11.5,
    turnRate: 2.9,
    driftGrip: 0.92,
    bodyColor: "#16a34a",
    roofColor: "#facc15",
    trimColor: "#111827"
  },
  rickshaw: {
    id: "rickshaw",
    name: "Dhaka Cycle Rickshaw",
    length: 2.35,
    width: 1.15,
    height: 1.78,
    radius: 0.92,
    maxSpeed: 6.2, // ~22 km/h
    reverseSpeed: -2.2,
    accel: 3.4,
    brake: 8.5,
    turnRate: 3.3,
    driftGrip: 0.96,
    bodyColor: "#dc2626",
    roofColor: "#38bdf8",
    trimColor: "#f59e0b"
  },
  corolla: {
    id: "corolla",
    name: "'92 Toyota Corolla DX",
    length: 4.25,
    width: 1.68,
    height: 1.38,
    radius: 1.48,
    maxSpeed: 36.5, // ~131 km/h
    reverseSpeed: -11.0,
    accel: 8.8,
    brake: 16.5,
    turnRate: 2.45,
    driftGrip: 0.89,
    bodyColor: "#e2e8f0",
    roofColor: "#cbd5e1",
    trimColor: "#1e293b"
  },
  brtc: {
    id: "brtc",
    name: "BRTC Double-Decker Bus",
    length: 11.2,
    width: 2.5,
    height: 4.35,
    radius: 3.25,
    maxSpeed: 20.5, // ~74 km/h
    reverseSpeed: -6.5,
    accel: 4.1,
    brake: 9.8,
    turnRate: 1.35,
    driftGrip: 0.95,
    bodyColor: "#b91c1c",
    roofColor: "#991b1b",
    trimColor: "#fbbf24"
  },
  police: {
    id: "police",
    name: "DMP Patrol Jeep",
    length: 4.35,
    width: 1.78,
    height: 1.88,
    radius: 1.54,
    maxSpeed: 35.0, // ~126 km/h
    reverseSpeed: -11.5,
    accel: 9.2,
    brake: 17.0,
    turnRate: 2.55,
    driftGrip: 0.90,
    bodyColor: "#1e3a8a",
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
    this.speed = 0; // meters/sec
    this.vx = 0;
    this.vy = 0;

    this.driver = "ai";
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
      this.speed *= Math.pow(0.18, dt);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    const hitWall = resolveWorldCollisions(this, prevX, prevY, colliders);
    if (hitWall) {
      this.speed *= 0.45;
      if (this.driver === "ai") {
        this.angle += 0.35;
      }
    }
  }

  updatePlayerDrive(dt, input) {
    const throttle = -input.moveY;
    const steer = input.moveX;
    const handbrake = input.sprint;

    if (throttle > 0.05) {
      this.speed += throttle * this.accel * dt;
    } else if (throttle < -0.05) {
      if (this.speed > 1.2) {
        this.speed += throttle * this.brake * dt;
      } else {
        this.speed += throttle * (this.accel * 0.7) * dt;
      }
    } else {
      this.speed *= Math.pow(0.32, dt);
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    if (handbrake) {
      this.speed *= Math.pow(0.08, dt);
    }

    this.speed = Math.max(this.reverseSpeed, Math.min(this.maxSpeed, this.speed));

    const speedFactor = Math.min(1, Math.abs(this.speed) / 4.5);
    const reverseSign = this.speed >= -0.05 ? 1 : -1;
    const turnMultiplier = handbrake ? 1.22 : 1.0;

    this.angle += steer * this.turnRate * speedFactor * reverseSign * turnMultiplier * dt;

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

    if (dist < 14) {
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

    this.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, angleDiff * 4.5 * dt));

    // Safe following distance in meters
    let blocked = false;
    const lookAhead = this.length * 0.65 + 4.5;
    const lookX = this.x + Math.cos(this.angle) * lookAhead;
    const lookY = this.y + Math.sin(this.angle) * lookAhead;

    for (const other of allVehicles) {
      if (other === this) continue;
      if (Math.hypot(other.x - lookX, other.y - lookY) < this.radius + other.radius + 1.8) {
        blocked = true;
        break;
      }
    }

    const cruiseSpeed = blocked ? 0 : Math.min(11.5, this.maxSpeed * 0.55);
    if (this.speed < cruiseSpeed) {
      this.speed = Math.min(cruiseSpeed, this.speed + this.accel * 0.65 * dt);
    } else {
      this.speed = Math.max(cruiseSpeed, this.speed - this.brake * dt);
    }

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

/**
 * Spawns 1:1 metric 90s Dhaka vehicles right beside the player spawn & across Tejgaon roads.
 */
export function spawnTejgaonTraffic() {
  const vehicles = [];
  const types = ["mishuk", "rickshaw", "corolla", "brtc", "police"];

  // Parked vehicles right on Shaheed Tajuddin Ahmed Ave beside player spawn (1525, 1380)
  vehicles.push(new Vehicle("mishuk", 1534, 1372, -Math.PI / 2, null));
  vehicles.push(new Vehicle("corolla", 1535, 1384, Math.PI / 2, null));
  vehicles.push(new Vehicle("rickshaw", 1533, 1393, -Math.PI / 2, null));
  vehicles.push(new Vehicle("brtc", 1542, 1362, -Math.PI / 2, null));

  // Populate AI traffic along Tejgaon roads
  ROADS.forEach((road, rIdx) => {
    if (road.points.length < 2) return;
    const count = road.type === "arterial" ? 5 : 2;

    for (let i = 0; i < count; i++) {
      const segIdx = i % (road.points.length - 1);
      const p1 = road.points[segIdx];
      const p2 = road.points[segIdx + 1];
      const t = 0.2 + ((i * 0.31) % 0.6);

      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

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
