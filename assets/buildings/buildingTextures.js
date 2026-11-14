/**
 * Shared procedural CanvasTextures for 1990s Dhaka architectural materials:
 *   - Multi-story apartment facade with recessed windows, balconies & grime
 *   - Corrugated tin / industrial brick factory walls & clerestory windows
 *   - Ground-floor Dhaka shop shutters & Bengali/English signboards
 *   - Custom landmark rooftop & facade billboards
 */
import * as THREE from "three";

const textureCache = new Map();

function createCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates a 90s Dhaka residential / commercial apartment facade texture
 * with concrete plaster, window grilles, dark glass, and tropical weathering.
 */
export function getApartmentFacadeTexture(baseHex = "#6b7280", stories = 5) {
  const key = `apt_${baseHex}_${stories}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 512);
  g.fillStyle = baseHex;
  g.fillRect(0, 0, 256, 512);

  // Subtle concrete plaster noise & monsoon rain streaks
  for (let i = 0; i < 900; i++) {
    g.fillStyle = i % 2 === 0 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)";
    g.fillRect((i * 73) % 256, (i * 137) % 512, 3, 8);
  }

  const rows = Math.max(2, stories);
  const cols = 3;
  const rowH = 512 / rows;
  const colW = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const y0 = r * rowH;

    // Floor slab concrete band
    g.fillStyle = "rgba(15, 23, 42, 0.32)";
    g.fillRect(0, y0, 256, 6);

    for (let col = 0; col < cols; col++) {
      const x0 = col * colW;
      const winW = colW * 0.54;
      const winH = rowH * 0.56;
      const wx = x0 + (colW - winW) / 2;
      const wy = y0 + rowH * 0.22;

      // Window recess frame
      g.fillStyle = "#1e293b";
      g.fillRect(wx - 3, wy - 3, winW + 6, winH + 6);

      // Dark tinted or warmly lit interior window pane
      const isLit = (r * 7 + col * 13) % 5 === 0;
      g.fillStyle = isLit ? "#fbbf24" : "#0f172a";
      g.fillRect(wx, wy, winW, winH);

      // Window reflection highlight & Bengali security grille bars
      g.fillStyle = isLit ? "rgba(254, 243, 199, 0.45)" : "rgba(148, 163, 184, 0.16)";
      g.fillRect(wx + 2, wy + 2, winW * 0.35, winH - 4);

      g.strokeStyle = "#334155";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(wx + winW / 2, wy);
      g.lineTo(wx + winW / 2, wy + winH);
      g.moveTo(wx, wy + winH / 2);
      g.lineTo(wx + winW, wy + winH / 2);
      g.stroke();

      // Concrete sill
      g.fillStyle = "#cbd5e1";
      g.fillRect(wx - 4, wy + winH + 2, winW + 8, 4);
    }
  }

  const tex = finalizeTexture(c, 1, 1);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates Tejgaon industrial red-brick + corrugated steel warehouse wall texture
 */
export function getIndustrialFacadeTexture() {
  const key = "industrial_wall";
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 256);

  // Lower 55%: weathered Dhaka red brick wall
  g.fillStyle = "#6e352c";
  g.fillRect(0, 110, 256, 146);

  g.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 114; y < 256; y += 10) {
    g.fillRect(0, y, 256, 1.5);
    const shift = (y / 10) % 2 === 0 ? 0 : 12;
    for (let x = shift; x < 256; x += 24) {
      g.fillRect(x, y, 1.5, 10);
    }
  }

  // Upper 45%: corrugated tin/steel cladding with high factory clerestory windows
  g.fillStyle = "#475569";
  g.fillRect(0, 0, 256, 110);
  for (let x = 0; x < 256; x += 6) {
    g.fillStyle = x % 12 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.16)";
    g.fillRect(x, 0, 3, 110);
  }

  // Clerestory factory glass strip
  g.fillStyle = "#0f172a";
  g.fillRect(14, 24, 228, 34);
  g.strokeStyle = "#94a3b8";
  g.lineWidth = 2;
  for (let x = 14; x <= 242; x += 28.5) {
    g.beginPath();
    g.moveTo(x, 24);
    g.lineTo(x, 58);
    g.stroke();
  }

  // Industrial steel roll-up loading bay door
  g.fillStyle = "#334155";
  g.fillRect(78, 142, 100, 114);
  g.strokeStyle = "#1e293b";
  g.lineWidth = 2;
  for (let y = 148; y < 256; y += 8) {
    g.beginPath();
    g.moveTo(78, y);
    g.lineTo(178, y);
    g.stroke();
  }

  const tex = finalizeTexture(c, 1, 1);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates corrugated tin / concrete rooftop texture with AC vents & tar seams
 */
export function getRooftopTexture(isMetal = false) {
  const key = isMetal ? "roof_metal" : "roof_concrete";
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(256, 256);
  g.fillStyle = isMetal ? "#4b5563" : "#525866";
  g.fillRect(0, 0, 256, 256);

  if (isMetal) {
    for (let x = 0; x < 256; x += 8) {
      g.fillStyle = x % 16 === 0 ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)";
      g.fillRect(x, 0, 4, 256);
    }
  } else {
    // Tar waterproofing joints & rooftop dust patches
    g.strokeStyle = "rgba(15, 23, 42, 0.35)";
    g.lineWidth = 3;
    for (let i = 64; i < 256; i += 64) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 256);
      g.moveTo(0, i);
      g.lineTo(256, i);
      g.stroke();
    }
  }

  const tex = finalizeTexture(c, 1, 1);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates 1990s Dhaka ground-floor shopfront shutters & painted signboards
 */
export function getShopfrontTexture(label = "TEJGAON STORE", accent = "#f59e0b") {
  const key = `shop_${label}_${accent}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(512, 128);
  g.fillStyle = "#1e293b";
  g.fillRect(0, 0, 512, 128);

  // Top shop signboard
  g.fillStyle = accent;
  g.fillRect(8, 6, 496, 36);
  g.fillStyle = "#0f172a";
  g.font = "bold 22px Consolas, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, 256, 25);

  // Rolling metal shop shutters
  for (let bay = 0; bay < 3; bay++) {
    const bx = 18 + bay * 164;
    g.fillStyle = bay === 1 ? "#334155" : "#475569";
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

  const tex = finalizeTexture(c, 1, 1);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates high-contrast GTA-style landmark signboards
 */
export function getLandmarkSignTexture(text, bg = "#0d1117", fg = "#f59e0b", border = "#f59e0b") {
  const key = `sign_${text}_${bg}_${fg}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, g] = createCanvas(512, 128);
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = border;
  g.lineWidth = 8;
  g.strokeRect(6, 6, 500, 116);

  g.fillStyle = fg;
  g.font = "bold 30px Consolas, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 64);

  const tex = finalizeTexture(c, 1, 1);
  textureCache.set(key, tex);
  return tex;
}
