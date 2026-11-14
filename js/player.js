import { MAP_CONFIG } from "./tejgaonMapData.js";
import { resolveWorldCollisions } from "./physics.js";

/**
 * Real-life 1:1 metric human proportions (1 unit = 1 meter):
 *   - Height: 1.72m
 *   - Shoulder width: 0.46m | Collision radius: 0.35m
 *   - Walk speed: 1.5 m/s (~5.4 km/h) | Sprint speed: 4.8 m/s (~17.3 km/h)
 */
export class Player {
  constructor(x = MAP_CONFIG.spawn.x, y = MAP_CONFIG.spawn.y) {
    this.x = x;
    this.y = y;
    this.radius = 0.35;
    this.height = 1.72;
    this.angle = -Math.PI / 2;

    this.walkSpeed = 1.65;
    this.sprintSpeed = 4.85;
    this.stamina = 100;
    this.maxStamina = 100;
    this.health = 100;
    this.maxHealth = 100;

    this.animTime = 0;
    this.isMoving = false;
    this.isSprinting = false;
    this.inVehicle = null;
  }

  update(dt, input, colliders) {
    if (this.inVehicle) {
      this.x = this.inVehicle.x;
      this.y = this.inVehicle.y;
      this.angle = this.inVehicle.angle;
      this.isMoving = false;
      this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
      return;
    }

    let vx = input.moveX;
    let vy = input.moveY;
    const mag = Math.hypot(vx, vy);

    if (mag > 0.05) {
      vx /= mag;
      vy /= mag;
      this.isMoving = true;

      if (input.sprint && this.stamina > 4) {
        this.isSprinting = true;
        this.stamina = Math.max(0, this.stamina - 28 * dt);
      } else {
        this.isSprinting = false;
        this.stamina = Math.min(this.maxStamina, this.stamina + 16 * dt);
      }

      const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
      const prevX = this.x;
      const prevY = this.y;

      this.x += vx * speed * dt;
      this.y += vy * speed * dt;
      this.angle = Math.atan2(vy, vx);
      this.animTime += dt * (this.isSprinting ? 13 : 8);

      resolveWorldCollisions(this, prevX, prevY, colliders);
    } else {
      this.isMoving = false;
      this.isSprinting = false;
      this.stamina = Math.min(this.maxStamina, this.stamina + 22 * dt);
    }
  }

  tryToggleVehicle(vehicles) {
    if (this.inVehicle) {
      const v = this.inVehicle;
      // Step out cleanly beside the vehicle door (half vehicle width + 0.85m clearance)
      const exitAngle = v.angle - Math.PI / 2;
      const offset = v.width * 0.5 + 0.85;
      this.x = v.x + Math.cos(exitAngle) * offset;
      this.y = v.y + Math.sin(exitAngle) * offset;
      this.angle = v.angle;
      v.driver = null;
      this.inVehicle = null;
      return { action: "exit", vehicle: v };
    }

    // Find nearest vehicle within realistic 4.2m door reach
    let nearest = null;
    let bestDist = 4.2;
    for (const v of vehicles) {
      const d = Math.hypot(v.x - this.x, v.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = v;
      }
    }

    if (nearest) {
      nearest.driver = "player";
      nearest.aiState = "hijacked";
      this.inVehicle = nearest;
      this.x = nearest.x;
      this.y = nearest.y;
      return { action: "enter", vehicle: nearest };
    }

    return null;
  }
}
