import {
  MAP_CONFIG,
  WATER_BODIES,
  ZONES,
  ROADS,
  RAILWAY_LINE,
  LANDMARKS
} from "./tejgaonMapData.js";

/**
 * Generates deterministic background city blocks & trees so the map feels dense
 * without overlapping main roads or waterbodies.
 */
function generateUrbanFill() {
  const blocks = [];
  const trees = [];
  let seed = 199607;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let gx = 160; gx < MAP_CONFIG.width - 180; gx += 135) {
    for (let gy = 140; gy < MAP_CONFIG.height - 160; gy += 135) {
      if (rand() < 0.28) continue;

      const bx = gx + (rand() - 0.5) * 24;
      const by = gy + (rand() - 0.5) * 24;
      const bw = 55 + rand() * 52;
      const bh = 50 + rand() * 52;

      if (isNearRoadOrWater(bx + bw / 2, by + bh / 2, 72)) continue;

      const palette = ["#262d37", "#2e3642", "#35312e", "#28333a", "#3a2f2b"];
      blocks.push({
        x: bx,
        y: by,
        w: bw,
        h: bh,
        color: palette[Math.floor(rand() * palette.length)],
        roofStripe: rand() > 0.45
      });
    }
  }

  for (let i = 0; i < 420; i++) {
    const tx = 100 + rand() * (MAP_CONFIG.width - 200);
    const ty = 100 + rand() * (MAP_CONFIG.height - 200);
    if (isNearRoadOrWater(tx, ty, 48)) continue;
    trees.push({
      x: tx,
      y: ty,
      r: 12 + rand() * 14
    });
  }

  return { blocks, trees };
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function isNearRoadOrWater(x, y, margin) {
  for (const road of ROADS) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const p1 = road.points[i];
      const p2 = road.points[i + 1];
      if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < road.width / 2 + margin) {
        return true;
      }
    }
  }
  for (let i = 0; i < RAILWAY_LINE.points.length - 1; i++) {
    const p1 = RAILWAY_LINE.points[i];
    const p2 = RAILWAY_LINE.points[i + 1];
    if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < 42 + margin) {
      return true;
    }
  }
  if (x > 2820 && y > 1050 && y < 2900) return true;
  if (x > 420 && x < 1780 && y > 280 && y < 1850) return true;

  return false;
}

export class CityRenderer {
  constructor() {
    this.urbanFill = generateUrbanFill();
  }

  renderWorld(ctx, camera, player, vehicles) {
    const { width, height } = ctx.canvas;
    ctx.save();

    ctx.fillStyle = "#181d24";
    ctx.fillRect(0, 0, width, height);

    ctx.translate(width / 2, height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = "#1b2129";
    ctx.fillRect(0, 0, MAP_CONFIG.width, MAP_CONFIG.height);

    this.drawZones(ctx);
    this.drawWaterBodies(ctx);
    this.drawUrbanBlocks(ctx);
    this.drawRoads(ctx);
    this.drawRailway(ctx);
    this.drawLandmarks(ctx);

    // Draw player on foot & all 90s vehicles
    player.draw(ctx);
    for (const v of vehicles) {
      v.draw(ctx);
    }

    // Highlight nearest hijackable vehicle when player is on foot
    if (!player.inVehicle) {
      this.drawHijackPrompt(ctx, player, vehicles);
    }

    this.drawTrees(ctx);

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, MAP_CONFIG.width, MAP_CONFIG.height);

    ctx.restore();
  }

  drawHijackPrompt(ctx, player, vehicles) {
    let nearest = null;
    let bestDist = 68;
    for (const v of vehicles) {
      const d = Math.hypot(v.x - player.x, v.y - player.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = v;
      }
    }
    if (!nearest) return;

    ctx.save();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(nearest.x, nearest.y, nearest.length * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(13, 17, 23, 0.88)";
    ctx.fillRect(nearest.x - 52, nearest.y - 44, 104, 18);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 11px Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("[F] HIJACK", nearest.x, nearest.y - 31);
    ctx.restore();
  }

  drawZones(ctx) {
    for (const z of ZONES) {
      if (z.type === "airfield") ctx.fillStyle = "#1e2a23";
      else if (z.type === "industrial") ctx.fillStyle = "#1f232b";
      else if (z.type === "commercial") ctx.fillStyle = "#242129";
      else ctx.fillStyle = "#1c2429";

      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x, z.y, z.w, z.h);
    }
  }

  drawWaterBodies(ctx) {
    for (const water of WATER_BODIES) {
      ctx.save();
      ctx.beginPath();
      water.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = "#0e3a53";
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#26333d";
      ctx.stroke();

      const cx = water.points.reduce((acc, p) => acc + p.x, 0) / water.points.length;
      const cy = water.points.reduce((acc, p) => acc + p.y, 0) / water.points.length;
      ctx.fillStyle = "#58a6ff";
      ctx.font = "bold 22px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(water.name.toUpperCase(), cx, cy);
      ctx.restore();
    }
  }

  drawUrbanBlocks(ctx) {
    for (const b of this.urbanFill.blocks) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(b.x + 5, b.y + 5, b.w, b.h);

      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      if (b.roofStripe) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      }
    }
  }

  drawRoads(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const road of ROADS) {
      ctx.beginPath();
      road.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = "#484f58";
      ctx.lineWidth = road.width + 12;
      ctx.stroke();
    }

    for (const road of ROADS) {
      ctx.beginPath();
      road.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = "#2b313a";
      ctx.lineWidth = road.width;
      ctx.stroke();
    }

    for (const road of ROADS) {
      ctx.save();
      ctx.beginPath();
      road.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.setLineDash(road.lanes === 4 ? [26, 20] : [16, 18]);
      ctx.strokeStyle = road.lanes === 4 ? "#d29922" : "rgba(230, 237, 243, 0.45)";
      ctx.lineWidth = road.lanes === 4 ? 3 : 2;
      ctx.stroke();
      ctx.restore();

      const midIdx = Math.floor(road.points.length / 2);
      const pA = road.points[Math.max(0, midIdx - 1)];
      const pB = road.points[midIdx];
      const mx = (pA.x + pB.x) / 2;
      const my = (pA.y + pB.y) / 2;
      const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle);
      ctx.fillStyle = "rgba(240, 246, 252, 0.72)";
      ctx.font = "bold 13px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(road.name, 0, -road.width / 2 - 8);
      ctx.restore();
    }
  }

  drawRailway(ctx) {
    const pts = RAILWAY_LINE.points;
    ctx.save();

    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = "#3d352e";
    ctx.lineWidth = 28;
    ctx.stroke();

    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.setLineDash([4, 10]);
    ctx.strokeStyle = "#1f1a16";
    ctx.lineWidth = 22;
    ctx.stroke();

    ctx.setLineDash([]);
    for (const offset of [-6, 6]) {
      ctx.beginPath();
      pts.forEach((p, i) =>
        i === 0 ? ctx.moveTo(p.x + offset, p.y) : ctx.lineTo(p.x + offset, p.y)
      );
      ctx.strokeStyle = "#9da7b3";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawLandmarks(ctx) {
    for (const lm of LANDMARKS) {
      ctx.save();

      if (lm.style === "runway") {
        ctx.fillStyle = "#2b3038";
        ctx.fillRect(lm.x, lm.y, lm.w, lm.h);
        ctx.strokeStyle = "#8b949e";
        ctx.lineWidth = 3;
        ctx.strokeRect(lm.x + 6, lm.y + 6, lm.w - 12, lm.h - 12);

        ctx.beginPath();
        ctx.setLineDash([34, 28]);
        ctx.moveTo(lm.x + lm.w / 2, lm.y + 30);
        ctx.lineTo(lm.x + lm.w / 2, lm.y + lm.h - 30);
        ctx.strokeStyle = "#f0f6fc";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(lm.x + 8, lm.y + 8, lm.w, lm.h);

        const colors = {
          hangar: "#34414e",
          station: "#5c342e",
          factory: "#38414d",
          office: "#2b4257",
          commercial: "#4a384c",
          civic: "#2d4a3e",
          market: "#52412c",
          bridge: "#495464"
        };
        ctx.fillStyle = colors[lm.style] || "#374151";
        ctx.fillRect(lm.x, lm.y, lm.w, lm.h);

        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.strokeRect(lm.x, lm.y, lm.w, lm.h);
      }

      ctx.fillStyle = "#f0f6fc";
      ctx.font = "bold 14px Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(lm.name, lm.x + lm.w / 2, lm.y + lm.h / 2 + 5);

      ctx.restore();
    }
  }

  drawTrees(ctx) {
    for (const t of this.urbanFill.trees) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(31, 71, 46, 0.85)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(43, 99, 63, 0.9)";
      ctx.fill();
    }
  }

  renderMinimap(minimapCtx, camera, player, vehicles) {
    const mw = minimapCtx.canvas.width;
    const mh = minimapCtx.canvas.height;
    const sx = mw / MAP_CONFIG.width;
    const sy = mh / MAP_CONFIG.height;

    minimapCtx.clearRect(0, 0, mw, mh);
    minimapCtx.fillStyle = "#11161d";
    minimapCtx.fillRect(0, 0, mw, mh);

    for (const water of WATER_BODIES) {
      minimapCtx.beginPath();
      water.points.forEach((p, i) => {
        if (i === 0) minimapCtx.moveTo(p.x * sx, p.y * sy);
        else minimapCtx.lineTo(p.x * sx, p.y * sy);
      });
      minimapCtx.closePath();
      minimapCtx.fillStyle = "#1d6fa5";
      minimapCtx.fill();
    }

    minimapCtx.strokeStyle = "#6e7681";
    minimapCtx.lineWidth = 2;
    for (const road of ROADS) {
      minimapCtx.beginPath();
      road.points.forEach((p, i) => {
        if (i === 0) minimapCtx.moveTo(p.x * sx, p.y * sy);
        else minimapCtx.lineTo(p.x * sx, p.y * sy);
      });
      minimapCtx.stroke();
    }

    minimapCtx.strokeStyle = "#d29922";
    minimapCtx.lineWidth = 1.5;
    minimapCtx.beginPath();
    RAILWAY_LINE.points.forEach((p, i) => {
      if (i === 0) minimapCtx.moveTo(p.x * sx, p.y * sy);
      else minimapCtx.lineTo(p.x * sx, p.y * sy);
    });
    minimapCtx.stroke();

    // Vehicle blips on radar
    for (const v of vehicles) {
      minimapCtx.fillStyle = v.id === "police" ? "#3b82f6" : "#9ca3af";
      minimapCtx.fillRect(v.x * sx - 1.5, v.y * sy - 1.5, 3, 3);
    }

    const viewW = (window.innerWidth / camera.zoom) * sx;
    const viewH = (window.innerHeight / camera.zoom) * sy;
    minimapCtx.strokeStyle = "rgba(88, 166, 255, 0.7)";
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(
      camera.x * sx - viewW / 2,
      camera.y * sy - viewH / 2,
      viewW,
      viewH
    );

    // Player dot
    minimapCtx.beginPath();
    minimapCtx.arc(player.x * sx, player.y * sy, 3.5, 0, Math.PI * 2);
    minimapCtx.fillStyle = "#f59e0b";
    minimapCtx.fill();
  }
}
