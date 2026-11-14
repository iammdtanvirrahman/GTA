/**
 * Shared procedural CanvasTextures + Emissive Night/Dusk Maps for 1990s Dhaka Architecture:
 *   - Multi-story apartment facade with concrete slabs, grilled windows, curtains & monsoon stains
 *   - Emissive window glow map so lit windows illuminate at dusk/night with zero extra PointLights
 *   - Tejgaon red-brick + corrugated steel industrial factory walls & loading bay shutters
 *   - Ground-floor Dhaka commercial shopfronts, workshops, clinics & Bengali/English signboards
 *   - Landmark billboards & rooftop Helipad ("H") deck texture
 */
import * as THREE from "three";

const textureCache = new Map();

function createCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1, isSRGB = true) {
  const tex = new THREE.CanvasTexture(canvas);
  if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates a realistic 90s Dhaka apartment / commercial facade texture
 * with concrete slab bands, grilled windows, curtains, and monsoon weathering.
 */
export function getApartmentFacadeTexture(baseHex = "#6b7280", stories = 5) {
  const key = `apt_${baseHex}_${stories}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 512);
  g.fillStyle = baseHex;
  g.fillRect(0, 0, 256, 512);

  // Concrete plaster grain & vertical monsoon rain streaks
  for (let i = 0; i < 1100; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 512;
    g.fillStyle = i % 3 === 0 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.04)";
    g.fillRect(x, y, 2, i % 5 === 0 ? 18 : 6);
  }

  // Vertical structural column pilasters at left/right edges
  g.fillStyle = "rgba(15, 23, 42, 0.22)";
  g.fillRect(0, 0, 12, 512);
  g.fillRect(244, 0, 12, 512);

  const rows = Math.max(2, stories);
  const cols = 3;
  const rowH = 512 / rows;
  const colW = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const y0 = r * rowH;

    // Floor slab concrete cornice band
    g.fillStyle = "rgba(15, 23, 42, 0.36)";
    g.fillRect(0, y0, 256, 7);
    g.fillStyle = "rgba(226, 232, 240, 0.14)";
    g.fillRect(0, y0 + 7, 256, 2);

    for (let col = 0; col < cols; col++) {
      const x0 = col * colW;
      const winW = colW * 0.54;
      const winH = rowH * 0.55;
      const wx = x0 + (colW - winW) / 2;
      const wy = y0 + rowH * 0.23;

      // Recessed concrete window frame
      g.fillStyle = "#1e293b";
      g.fillRect(wx - 3, wy - 3, winW + 6, winH + 6);

      // Lit warm room vs dark reflective glass
      const isLit = (r * 7 + col * 13 + stories) % 5 === 0;
      g.fillStyle = isLit ? "#fbbf24" : "#0b1220";
      g.fillRect(wx, wy, winW, winH);

      if (isLit) {
        // Interior curtain silhouette
        g.fillStyle = "rgba(180, 83, 9, 0.42)";
        g.fillRect(wx, wy, winW * 0.28, winH);
        g.fillRect(wx + winW * 0.72, wy, winW * 0.28, winH);
      } else {
        // Sky reflection diagonal sheen
        g.fillStyle = "rgba(148, 163, 184, 0.16)";
        g.fillRect(wx + 2, wy + 2, winW * 0.36, winH - 4);
      }

      // Traditional Dhaka iron window security grille
      g.strokeStyle = "#334155";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(wx + winW / 2, wy);
      g.lineTo(wx + winW / 2, wy + winH);
      g.moveTo(wx, wy + winH * 0.35);
      g.lineTo(wx + winW, wy + winH * 0.35);
      g.moveTo(wx, wy + winH * 0.7);
      g.lineTo(wx + winW, wy + winH * 0.7);
      g.stroke();

      // Concrete sill
      g.fillStyle = "#cbd5e1";
      g.fillRect(wx - 4, wy + winH + 2, winW + 8, 4);
    }
  }

  const tex = finalizeTexture(c, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Matching emissive window texture so lit apartments glow naturally without dynamic lights.
 */
export function getApartmentEmissiveTexture(stories = 5) {
  const key = `apt_emissive_${stories}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 512);
  g.fillStyle = "#000000";
  g.fillRect(0, 0, 256, 512);

  const rows = Math.max(2, stories);
  const cols = 3;
  const rowH = 512 / rows;
  const colW = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const y0 = r * rowH;
    for (let col = 0; col < cols; col++) {
      const isLit = (r * 7 + col * 13 + stories) % 5 === 0;
      if (!isLit) continue;

      const x0 = col * colW;
      const winW = colW * 0.54;
      const winH = rowH * 0.55;
      const wx = x0 + (colW - winW) / 2;
      const wy = y0 + rowH * 0.23;

      g.fillStyle = "#f59e0b";
      g.fillRect(wx, wy, winW, winH);
    }
  }

  const tex = finalizeTexture(c, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates Tejgaon industrial red-brick + corrugated steel warehouse wall texture
 */
export function getIndustrialFacadeTexture() {
  const key = "industrial_wall_v2";
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 256);

  // Lower 56%: weathered Dhaka red brick wall
  g.fillStyle = "#6e352c";
  g.fillRect(0, 112, 256, 144);

  g.fillStyle = "rgba(0,0,0,0.2)";
  for (let y = 114; y < 256; y += 9) {
    g.fillRect(0, y, 256, 1.5);
    const shift = (y / 9) % 2 === 0 ? 0 : 12;
    for (let x = shift; x < 256; x += 24) {
      g.fillRect(x, y, 1.5, 9);
    }
  }

  // Concrete damp-proof plinth at base
  g.fillStyle = "#334155";
  g.fillRect(0, 236, 256, 20);

  // Upper 44%: corrugated tin/steel cladding with high factory clerestory windows
  g.fillStyle = "#475569";
  g.fillRect(0, 0, 256, 112);
  for (let x = 0; x < 256; x += 6) {
    g.fillStyle = x % 12 === 0 ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.18)";
    g.fillRect(x, 0, 3, 112);
  }

  // Clerestory factory glass strip
  g.fillStyle = "#0f172a";
  g.fillRect(14, 22, 228, 34);
  g.strokeStyle = "#94a3b8";
  g.lineWidth = 2;
  for (let x = 14; x <= 242; x += 28.5) {
    g.beginPath();
    g.moveTo(x, 22);
    g.lineTo(x, 56);
    g.stroke();
  }

  // Yellow/black industrial safety hazard border around loading bay
  g.fillStyle = "#eab308";
  g.fillRect(72, 136, 112, 120);
  g.fillStyle = "#0f172a";
  for (let i = 0; i < 12; i++) {
    g.fillRect(72 + i * 10, 136, 5, 8);
  }

  // Industrial steel roll-up loading bay door
  g.fillStyle = "#334155";
  g.fillRect(78, 144, 100, 112);
  g.strokeStyle = "#1e293b";
  g.lineWidth = 2;
  for (let y = 150; y < 256; y += 7) {
    g.beginPath();
    g.moveTo(78, y);
    g.lineTo(178, y);
    g.stroke();
  }

  const tex = finalizeTexture(c, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates corrugated tin / concrete rooftop texture with tar seams & weathering
 */
export function getRooftopTexture(isMetal = false) {
  const key = isMetal ? "roof_metal_v2" : "roof_concrete_v2";
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 256);
  g.fillStyle = isMetal ? "#4b5563" : "#525866";
  g.fillRect(0, 0, 256, 256);

  if (isMetal) {
    for (let x = 0; x < 256; x += 8) {
      g.fillStyle = x % 16 === 0 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.2)";
      g.fillRect(x, 0, 4, 256);
    }
    // Horizontal sheet overlap seams
    g.fillStyle = "rgba(15, 23, 42, 0.35)";
    g.fillRect(0, 84, 256, 3);
    g.fillRect(0, 170, 256, 3);
  } else {
    g.strokeStyle = "rgba(15, 23, 42, 0.38)";
    g.lineWidth = 3;
    for (let i = 64; i < 256; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
    // Monsoon damp moss stains near corners
    g.fillStyle = "rgba(20, 83, 45, 0.14)";
    g.fillRect(8, 8, 56, 56);
    g.fillRect(192, 188, 56, 60);
  }

  const tex = finalizeTexture(c, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates 1990s Dhaka ground-floor shopfront shutters, open glowing stalls & painted signboards
 */
export function getShopfrontTexture(label = "TEJGAON STORE", accent = "#f59e0b", mode = "shop") {
  const key = `shop_${label}_${accent}_${mode}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(512, 128);
  g.fillStyle = "#1e293b";
  g.fillRect(0, 0, 512, 128);

  // Top painted signboard
  g.fillStyle = accent;
  g.fillRect(8, 6, 496, 36);
  g.strokeStyle = "#0f172a";
  g.lineWidth = 3;
  g.strokeRect(10, 8, 492, 32);

  g.fillStyle = mode === "clinic" ? "#ffffff" : "#0f172a";
  g.font = "bold 21px Consolas, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, 256, 25);

  // Three ground-floor bays: center bay open with warm interior glow, side bays corrugated shutters
  for (let bay = 0; bay < 3; bay++) {
    const bx = 18 + bay * 164;
    if (bay === 1) {
      // Open illuminated shop / garage interior
      g.fillStyle = mode === "workshop" ? "#334155" : "#fef3c7";
      g.fillRect(bx, 48, 148, 80);
      // Warm counter / shelf silhouette
      g.fillStyle = mode === "workshop" ? "#0f172a" : "#92400e";
      g.fillRect(bx + 10, 88, 128, 40);
      // Fluorescent tube light strip at top of bay
      g.fillStyle = "#ffffff";
      g.fillRect(bx + 24, 52, 100, 5);
    } else {
      g.fillStyle = "#475569";
      g.fillRect(bx, 48, 148, 80);
      g.strokeStyle = "#0f172a";
      g.lineWidth = 2;
      for (let y = 54; y < 128; y += 7) {
        g.beginPath();
        g.moveTo(bx, y);
        g.lineTo(bx + 148, y);
        g.stroke();
      }
    }
  }

  const tex = finalizeTexture(c, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates high-contrast GTA-style landmark signboards
 */
export function getLandmarkSignTexture(text, bg = "#0d1117", fg = "#f59e0b", border = "#f59e0b") {
  const key = `sign_${text}_${bg}_${fg}_${border}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(512, 128);
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = border;
  g.lineWidth = 8;
  g.strokeRect(6, 6, 500, 116);

  g.fillStyle = fg;
  g.font = "bold 28px Consolas, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 64);

  const tex = finalizeTexture(c, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates an authentic rooftop Helipad ("H") deck texture
 */
export function getHelipadTexture() {
  const key = "helipad_h";
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 256);
  g.fillStyle = "#334155";
  g.fillRect(0, 0, 256, 256);

  // Dashed yellow perimeter circle
  g.strokeStyle = "#facc15";
  g.lineWidth = 10;
  g.setLineDash([22, 14]);
  g.beginPath();
  g.arc(128, 128, 98, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  // Bold white "H"
  g.fillStyle = "#f8fafc";
  g.fillRect(84, 72, 22, 112);
  g.fillRect(150, 72, 22, 112);
  g.fillRect(84, 117, 88, 22);

  const tex = finalizeTexture(c, 1, 1, true);
  textureCache.set(key, tex);
  return tex;
}
