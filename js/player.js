import { MAP_CONFIG } from "./tejgaonMapData.js";
import { resolveWorldCollisions } from "./physics.js";

export class Player {
  constructor(x = MAP_CONFIG.spawn.x, y = MAP_CONFIG.spawn.y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.angle = -Math.PI / 2;

    this.walkSpeed = 165;
    this.sprintSpeed = 285;
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
        this.stamina = Math.max(0, this.stamina - 32 * dt);
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
      this.animTime += dt * (this.isSprinting ? 14 : 9);

      resolveWorldCollisions(this, prevX, prevY, colliders);
    } else {
      this.isMoving = false;
      this.isSprinting = false;
      this.stamina = Math.min(this.maxStamina, this.stamina + 22 * dt);
    }
  }

  tryToggleVehicle(vehicles) {
    // Exit current vehicle
    if (this.inVehicle) {
      const v = this.inVehicle;
      // Step out to left side of vehicle
      const exitAngle = v.angle - Math.PI / 2;
      this.x = v.x + Math.cos(exitAngle) * (v.width * 0.75 + 16);
      this.y = v.y + Math.sin(exitAngle) * (v.width * 0.75 + 16);
      this.angle = v.angle;
      v.driver = null;
      this.inVehicle = null;
      return { action: "exit", vehicle: v };
    }

    // Find nearest vehicle within hijack radius
    let nearest = null;
    let bestDist = 68;
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

  draw(ctx) {
    if (this.inVehicle) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const swing = this.isMoving ? Math.sin(this.animTime) * 5 : 0;

    // Ground shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.beginPath();
    ctx.ellipse(-2, 3, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sneakers / Feet
    ctx.fillStyle = "#161b22";
    ctx.beginPath();
    ctx.arc(swing, -5, 3.5, 0, Math.PI * 2);
    ctx.arc(-swing, 5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = "#d99b66";
    ctx.beginPath();
    ctx.arc(-swing * 0.8, -10, 3.2, 0, Math.PI * 2);
    ctx.arc(swing * 0.8, 10, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // 90s Dhaka Bomber / Denim Jacket Torso
    ctx.fillStyle = "#1f6feb";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#0d1117";
    ctx.stroke();

    // Head & Dark Hair
    ctx.fillStyle = "#21262d";
    ctx.beginPath();
    ctx.arc(1, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Face / Nose orientation
    ctx.fillStyle = "#d99b66";
    ctx.beginPath();
    ctx.arc(4.5, 0, 3.2, -0.9, 0.9);
    ctx.fill();

    ctx.restore();
  }
}
