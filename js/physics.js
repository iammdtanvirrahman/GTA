import { MAP_CONFIG } from "./tejgaonMapData.js";

/**
 * Resolves vehicle-to-vehicle & vehicle-to-pedestrian collisions at 1:1 meter scale.
 */
export function resolveEntityCollisions(player, vehicles) {
  // Vehicle vs Vehicle
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDist = a.radius + b.radius;
      const distSq = dx * dx + dy * dy;

      if (distSq > 0.0001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (minDist - dist) * 0.5;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const sepVel = relVx * nx + relVy * ny;
        if (sepVel < 0) {
          const impulse = sepVel * 0.65;
          a.vx += nx * impulse;
          a.vy += ny * impulse;
          b.vx -= nx * impulse;
          b.vy -= ny * impulse;
          a.speed *= 0.85;
          b.speed *= 0.85;
        }
      }
    }
  }

  // On-foot player vs Vehicles
  if (!player.inVehicle) {
    for (const v of vehicles) {
      const dx = player.x - v.x;
      const dy = player.y - v.y;
      const minDist = player.radius + v.radius;
      const distSq = dx * dx + dy * dy;

      if (distSq > 0.0001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        player.x += nx * overlap;
        player.y += ny * overlap;

        // Impact damage if hit above 7 m/s (~25 km/h)
        const vSpeed = Math.abs(v.speed);
        if (vSpeed > 7.0) {
          player.x += nx * 1.4;
          player.y += ny * 1.4;
          player.health = Math.max(0, player.health - Math.round((vSpeed - 6) * 2.2));
          v.speed *= 0.65;
        }
      }
    }
  }
}
