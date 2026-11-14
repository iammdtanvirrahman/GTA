import { MAP_CONFIG, WATER_BODIES, LANDMARKS } from "./tejgaonMapData.js";

/**
 * Builds static AABB colliders for solid landmarks and generated urban buildings.
 * Note: "runway" and "bridge" are passable surfaces, not solid walls.
 */
export function buildStaticColliders(urbanBlocks) {
  const colliders = [];

  for (const lm of LANDMARKS) {
    if (lm.style === "runway" || lm.style === "bridge") continue;
    colliders.push({
      x: lm.x,
      y: lm.y,
      w: lm.w,
      h: lm.h,
      label: lm.name
    });
  }

  for (const b of urbanBlocks) {
    colliders.push({
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      label: "Building"
    });
  }

  return colliders;
}

/**
 * Ray-casting point-in-polygon test for Hatirjheel & Crescent Lake.
 */
export function isPointInWater(px, py) {
  // Allow crossing over Hatirjheel bridge deck
  for (const lm of LANDMARKS) {
    if (
      lm.style === "bridge" &&
      px >= lm.x - 20 &&
      px <= lm.x + lm.w + 20 &&
      py >= lm.y - 20 &&
      py <= lm.y + lm.h + 20
    ) {
      return false;
    }
  }

  for (const water of WATER_BODIES) {
    const pts = water.points;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x;
      const yi = pts[i].y;
      const xj = pts[j].x;
      const yj = pts[j].y;

      const intersect =
        yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

/**
 * Resolves a circle (x, y, radius) against an AABB box. Returns true if pushed out.
 */
export function resolveCircleAABB(entity, box) {
  const closestX = Math.max(box.x, Math.min(entity.x, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(entity.y, box.y + box.h));
  const dx = entity.x - closestX;
  const dy = entity.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= entity.radius * entity.radius) return false;

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    const overlap = entity.radius - dist;
    entity.x += (dx / dist) * overlap;
    entity.y += (dy / dist) * overlap;
  } else {
    // Center is inside box; push out along shallowest axis
    const leftPen = Math.abs(entity.x - box.x);
    const rightPen = Math.abs(box.x + box.w - entity.x);
    const topPen = Math.abs(entity.y - box.y);
    const bottomPen = Math.abs(box.y + box.h - entity.y);
    const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);

    if (minPen === leftPen) entity.x = box.x - entity.radius;
    else if (minPen === rightPen) entity.x = box.x + box.w + entity.radius;
    else if (minPen === topPen) entity.y = box.y - entity.radius;
    else entity.y = box.y + box.h + entity.radius;
  }
  return true;
}

/**
 * Resolves circle collisions against world borders, buildings, and water shorelines.
 */
export function resolveWorldCollisions(entity, prevX, prevY, colliders) {
  const pad = entity.radius + 8;
  entity.x = Math.max(pad, Math.min(MAP_CONFIG.width - pad, entity.x));
  entity.y = Math.max(pad, Math.min(MAP_CONFIG.height - pad, entity.y));

  let collided = false;
  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i];
    // Broadphase skip
    if (
      entity.x + entity.radius < box.x ||
      entity.x - entity.radius > box.x + box.w ||
      entity.y + entity.radius < box.y ||
      entity.y - entity.radius > box.y + box.h
    ) {
      continue;
    }
    if (resolveCircleAABB(entity, box)) {
      collided = true;
    }
  }

  // Prevent walking/driving into Hatirjheel Lake
  if (isPointInWater(entity.x, entity.y)) {
    if (!isPointInWater(prevX, entity.y)) {
      entity.x = prevX;
    } else if (!isPointInWater(entity.x, prevY)) {
      entity.y = prevY;
    } else {
      entity.x = prevX;
      entity.y = prevY;
    }
    collided = true;
  }

  return collided;
}

/**
 * Vehicle-to-vehicle & vehicle-to-pedestrian collision separation.
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

      if (distSq > 0.001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (minDist - dist) * 0.5;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Momentum transfer
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

      if (distSq > 0.001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        player.x += nx * overlap;
        player.y += ny * overlap;

        // Knockback & minor damage if hit by fast traffic
        const vSpeed = Math.abs(v.speed);
        if (vSpeed > 150) {
          player.x += nx * 18;
          player.y += ny * 18;
          player.health = Math.max(0, player.health - Math.round(vSpeed * 0.035));
          v.speed *= 0.6;
        }
      }
    }
  }
}
