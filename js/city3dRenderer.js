import * as THREE from "three";
import {
  MAP_CONFIG,
  WATER_BODIES,
  ZONES,
  ROADS,
  RAILWAY_LINE,
  LANDMARKS
} from "./tejgaonMapData.js";

/**
 * Generates deterministic 1:1 metric urban blocks & trees in Tejgaon (1 unit = 1 meter):
 *   - Industrial tin-sheds & godowns: 14m–28m footprints, 5m–9m tall
 *   - Dhaka mid-rise apartments/offices: 16m–30m footprints, 12m–28m tall (4 to 9 stories)
 *   - Roadside trees: 0.25m trunk radius, 2.5m–5.5m canopy radius, 6m–11m height
 */
export function generateUrbanLayout() {
  const blocks = [];
  const trees = [];
  let seed = 199607;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let gx = 65; gx < MAP_CONFIG.width - 75; gx += 46) {
    for (let gy = 65; gy < MAP_CONFIG.height - 75; gy += 46) {
      if (rand() < 0.24) continue;

      const bx = gx + (rand() - 0.5) * 8;
      const by = gy + (rand() - 0.5) * 8;
      const bw = 16 + rand() * 18;
      const bh = 15 + rand() * 18;

      if (isNearRoadOrWater(bx + bw / 2, by + bh / 2, 24)) continue;

      const palette = [0x3b4252, 0x434c5e, 0x4c566a, 0x5c4738, 0x3b4d47, 0x523f49];
      const isWarehouse = rand() > 0.52;
      blocks.push({
        x: bx,
        y: by,
        w: bw,
        h: bh,
        height: isWarehouse ? 5.5 + rand() * 4.5 : 12 + rand() * 18,
        color: palette[Math.floor(rand() * palette.length)],
        hasWaterTank: !isWarehouse && rand() > 0.32
      });
    }
  }

  for (let i = 0; i < 620; i++) {
    const tx = 45 + rand() * (MAP_CONFIG.width - 90);
    const ty = 45 + rand() * (MAP_CONFIG.height - 90);
    if (isNearRoadOrWater(tx, ty, 16)) continue;
    trees.push({
      x: tx,
      y: ty,
      r: 2.6 + rand() * 2.6
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
    if (distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) < 12 + margin) {
      return true;
    }
  }
  // Keep Hatirjheel basin & Old Airport runway strip clear
  if (x > 1710 && y > 680 && y < 1860) return true;
  if (x > 260 && x < 1080 && y > 130 && y < 1260) return true;
  return false;
}

function makeSignTexture(text, bg = "#0d1117", fg = "#f59e0b", border = "#f59e0b") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");

  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = border;
  g.lineWidth = 8;
  g.strokeRect(6, 6, c.width - 12, c.height - 12);

  g.fillStyle = fg;
  g.font = "bold 32px Consolas, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class City3DRenderer {
  constructor(canvas, urbanLayout) {
    this.urbanLayout = urbanLayout;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x161d29);
    this.scene.fog = new THREE.FogExp2(0x1a2230, 0.0011);

    // Near clipping plane = 0.25m so close human-eye camera views never clip
    this.camera = new THREE.PerspectiveCamera(
      54,
      window.innerWidth / window.innerHeight,
      0.25,
      2800
    );

    this.vehicleMeshes = new Map();
    this.sirenLights = [];
    this.waterMeshes = [];

    this.setupLights();
    this.buildTerrainAndZones();
    this.buildWaterBodies();
    this.buildRoadsAndRailway();
    this.buildLandmarks();
    this.buildUrbanBlocks();
    this.buildTrees();
    this.buildPlayerMesh();
    this.buildHijackRing();
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x292524, 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffedd5, 1.95);
    sun.position.set(450, 620, 380);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 1800;
    const d = 320;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    this.sunLight = sun;
  }

  buildTerrainAndZones() {
    const groundGeo = new THREE.PlaneGeometry(MAP_CONFIG.width, MAP_CONFIG.height);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x222831,
      roughness: 0.92,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(MAP_CONFIG.width / 2, 0, MAP_CONFIG.height / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    for (const z of ZONES) {
      const colors = {
        airfield: 0x233329,
        industrial: 0x262b34,
        commercial: 0x2c2733,
        residential: 0x222c32
      };
      const geo = new THREE.PlaneGeometry(z.w, z.h);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[z.type] || 0x242a33,
        roughness: 0.9
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(z.x + z.w / 2, 0.03, z.y + z.h / 2);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }

    // Perimeter boundary wall (3.2m high)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const h = 3.2;
    const t = 1.5;
    const borders = [
      [MAP_CONFIG.width, h, t, MAP_CONFIG.width / 2, h / 2, 0],
      [MAP_CONFIG.width, h, t, MAP_CONFIG.width / 2, h / 2, MAP_CONFIG.height],
      [t, h, MAP_CONFIG.height, 0, h / 2, MAP_CONFIG.height / 2],
      [t, h, MAP_CONFIG.height, MAP_CONFIG.width, h / 2, MAP_CONFIG.height / 2]
    ];
    for (const [w, bh, d, x, y, z] of borders) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, bh, d), wallMat);
      m.position.set(x, y, z);
      this.scene.add(m);
    }
  }

  buildWaterBodies() {
    for (const water of WATER_BODIES) {
      const shape = new THREE.Shape();
      water.points.forEach((pt, idx) => {
        if (idx === 0) shape.moveTo(pt.x, -pt.y);
        else shape.lineTo(pt.x, -pt.y);
      });
      shape.closePath();

      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0c4a6e,
        emissive: 0x082f49,
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.65
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.06;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.waterMeshes.push(mesh);

      const linePts = water.points.map((p) => new THREE.Vector3(p.x, 0.65, p.y));
      linePts.push(linePts[0].clone());
      const curbGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const curbMat = new THREE.LineBasicMaterial({ color: 0x64748b });
      this.scene.add(new THREE.Line(curbGeo, curbMat));
    }
  }

  buildRoadsAndRailway() {
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.85 });
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2d333b, roughness: 0.88 });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, metalness: 0.6 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (const road of ROADS) {
      const sidewalkMargin = road.type === "arterial" ? 4.4 : 2.6;

      for (let i = 0; i < road.points.length - 1; i++) {
        const p1 = road.points[i];
        const p2 = road.points[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.y - p1.y;
        const len = Math.hypot(dx, dz);
        if (len < 0.5) continue;

        const angle = Math.atan2(dz, dx);
        const mx = (p1.x + p2.x) / 2;
        const mz = (p1.y + p2.y) / 2;

        // Raised Dhaka footpath (0.18m curb height)
        const curbMesh = new THREE.Mesh(
          new THREE.BoxGeometry(len + road.width * 0.5, 0.18, road.width + sidewalkMargin),
          sidewalkMat
        );
        curbMesh.position.set(mx, 0.09, mz);
        curbMesh.rotation.y = -angle;
        curbMesh.receiveShadow = true;
        this.scene.add(curbMesh);

        // Asphalt surface
        const roadMesh = new THREE.Mesh(
          new THREE.BoxGeometry(len + road.width * 0.35, 0.22, road.width),
          asphaltMat
        );
        roadMesh.position.set(mx, 0.11, mz);
        roadMesh.rotation.y = -angle;
        roadMesh.receiveShadow = true;
        this.scene.add(roadMesh);

        // Real-life 3.0m dashed lane lines (0.15m wide)
        const dashStep = 9.0;
        const dashCount = Math.floor(len / dashStep);
        const dashMat = road.lanes === 4 ? yellowLineMat : whiteLineMat;
        for (let d = 0; d < dashCount; d++) {
          const t = (d + 0.5) / dashCount;
          const lx = p1.x + dx * t;
          const lz = p1.y + dz * t;
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.16), dashMat);
          dash.rotation.x = -Math.PI / 2;
          dash.rotation.z = -angle;
          dash.position.set(lx, 0.23, lz);
          this.scene.add(dash);
        }

        // Real-life 8.5m streetlamps spaced every 38m along arterial roads
        if (road.type === "arterial" && len > 50) {
          const lampStep = 38;
          const lamps = Math.floor(len / lampStep);
          const nx = -dz / len;
          const nz = dx / len;
          for (let l = 1; l < lamps; l++) {
            const t = l / lamps;
            const side = l % 2 === 0 ? 1 : -1;
            const offsetDist = road.width / 2 + 1.1;
            const sx = p1.x + dx * t + nx * offsetDist * side;
            const sz = p1.y + dz * t + nz * offsetDist * side;

            const pole = new THREE.Mesh(
              new THREE.CylinderGeometry(0.11, 0.16, 8.5, 6),
              poleMat
            );
            pole.position.set(sx, 4.25, sz);
            this.scene.add(pole);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), poleMat);
            arm.position.set(sx - nx * 0.9 * side, 8.4, sz - nz * 0.9 * side);
            arm.rotation.y = -angle;
            this.scene.add(arm);

            const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.32), bulbMat);
            lamp.position.set(sx - nx * 1.8 * side, 8.3, sz - nz * 1.8 * side);
            this.scene.add(lamp);
          }
        }
      }
    }

    // Real-life Bangladesh Railway Broad-Gauge Track (1.676m rail gauge, 2.75m sleepers)
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x443b32, roughness: 0.95 });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x261e18, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.25
    });

    const pts = RAILWAY_LINE.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.y - p1.y;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      const mx = (p1.x + p2.x) / 2;
      const mz = (p1.y + p2.y) / 2;

      const ballast = new THREE.Mesh(new THREE.BoxGeometry(len, 0.35, 5.2), ballastMat);
      ballast.position.set(mx, 0.175, mz);
      ballast.rotation.y = -angle;
      ballast.receiveShadow = true;
      this.scene.add(ballast);

      const sleepers = Math.floor(len / 0.85);
      for (let s = 0; s < sleepers; s++) {
        const t = s / sleepers;
        const sl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 2.75), sleeperMat);
        sl.position.set(p1.x + dx * t, 0.4, p1.y + dz * t);
        sl.rotation.y = -angle;
        this.scene.add(sl);
      }

      // Broad-gauge 1.676m spacing (+/- 0.84m from center)
      for (const offset of [-0.84, 0.84]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18, 0.1), railMat);
        rail.position.set(
          mx - Math.sin(angle) * offset,
          0.55,
          mz + Math.cos(angle) * offset
        );
        rail.rotation.y = -angle;
        this.scene.add(rail);
      }
    }
  }

  buildLandmarks() {
    // True-to-life landmark heights in meters
    const landmarkStyles = {
      hangar: { height: 14, color: 0x475569 },
      station: { height: 7.5, color: 0x7c2d12 },
      factory: { height: 15, color: 0x334155 },
      office: { height: 42, color: 0x1e3a5f }, // ~12-story WASA / Media Bhaban
      commercial: { height: 26, color: 0x581c87 }, // ~7-story Farmgate plaza
      civic: { height: 18, color: 0x14532d },
      market: { height: 8.5, color: 0x78350f }
    };

    for (const lm of LANDMARKS) {
      const cx = lm.x + lm.w / 2;
      const cz = lm.y + lm.h / 2;

      if (lm.style === "runway") {
        const tarmac = new THREE.Mesh(
          new THREE.BoxGeometry(lm.w, 0.25, lm.h),
          new THREE.MeshStandardMaterial({ color: 0x333942, roughness: 0.85 })
        );
        tarmac.position.set(cx, 0.125, cz);
        tarmac.receiveShadow = true;
        this.scene.add(tarmac);

        for (let y = lm.y + 25; y < lm.y + lm.h - 25; y += 36) {
          const stripe = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 18),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc })
          );
          stripe.rotation.x = -Math.PI / 2;
          stripe.position.set(cx, 0.27, y);
          this.scene.add(stripe);
        }
        continue;
      }

      if (lm.style === "bridge") {
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(lm.w + 12, 1.2, lm.h),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 })
        );
        deck.position.set(cx, 1.4, cz);
        deck.castShadow = true;
        deck.receiveShadow = true;
        this.scene.add(deck);

        for (const zOff of [-lm.h / 2 + 1.2, lm.h / 2 - 1.2]) {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(lm.w * 0.45, 0.85, 8, 24, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 })
          );
          arch.position.set(cx, 1.6, cz + zOff);
          arch.castShadow = true;
          this.scene.add(arch);
        }
        continue;
      }

      const spec = landmarkStyles[lm.style] || { height: 14, color: 0x374151 };
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(lm.w, spec.height, lm.h),
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.72 })
      );
      mesh.position.set(cx, spec.height / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(lm.w + 0.8, 0.8, lm.h + 0.8),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
      );
      trim.position.set(cx, spec.height + 0.4, cz);
      this.scene.add(trim);

      const tex = makeSignTexture(lm.name);
      const signW = Math.min(lm.w * 0.85, 32);
      const signH = signW * 0.25;
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(signW, signH),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
      );
      signMesh.position.set(cx, spec.height + signH * 0.65, cz);
      this.scene.add(signMesh);
    }
  }

  buildUrbanBlocks() {
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.4,
      metalness: 0.2
    });
    const parapetMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });

    for (const b of this.urbanLayout.blocks) {
      const cx = b.x + b.w / 2;
      const cz = b.y + b.h / 2;

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.height, b.h),
        new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.8 })
      );
      mesh.position.set(cx, b.height / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // 0.9m rooftop parapet wall
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(b.w + 0.4, 0.9, b.h + 0.4),
        parapetMat
      );
      roof.position.set(cx, b.height + 0.45, cz);
      this.scene.add(roof);

      // Realistic 1,500L rooftop water tank (1.2m diameter x 1.5m tall)
      if (b.hasWaterTank) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 10), tankMat);
        tank.position.set(cx + b.w * 0.2, b.height + 1.55, cz - b.h * 0.2);
        tank.castShadow = true;
        this.scene.add(tank);
      }
    }
  }

  buildTrees() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x452715, roughness: 0.9 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });

    for (const t of this.urbanLayout.trees) {
      const group = new THREE.Group();
      group.position.set(t.x, 0, t.y);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.35, 3.6, 6),
        trunkMat
      );
      trunk.position.y = 1.8;
      trunk.castShadow = true;
      group.add(trunk);

      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(t.r, 1), leafMat1);
      crown1.position.y = 4.6;
      crown1.castShadow = true;
      group.add(crown1);

      const crown2 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(t.r * 0.72, 1),
        leafMat2
      );
      crown2.position.set(0.7, 6.1, -0.5);
      group.add(crown2);

      this.scene.add(group);
    }
  }

  /**
   * 1:1 Realistic Human Proportions (1.72m tall, 0.46m shoulder width)
   */
  buildPlayerMesh() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b66, roughness: 0.7 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

    // Legs (0.82m inseam)
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.82, 0.16), pantsMat);
    this.leftLeg.position.set(0, 0.41, -0.11);
    this.leftLeg.castShadow = true;
    group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.82, 0.16), pantsMat);
    this.rightLeg.position.set(0, 0.41, 0.11);
    this.rightLeg.castShadow = true;
    group.add(this.rightLeg);

    // Torso (0.58m tall, 0.44m wide)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.58, 0.44), jacketMat);
    torso.position.set(0, 1.11, 0);
    torso.castShadow = true;
    group.add(torso);

    // Arms (0.56m long)
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.56, 0.13), jacketMat);
    this.leftArm.position.set(0, 1.1, -0.29);
    this.leftArm.castShadow = true;
    group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.56, 0.13), jacketMat);
    this.rightArm.position.set(0, 1.1, 0.29);
    this.rightArm.castShadow = true;
    group.add(this.rightArm);

    // Head (0.24m tall) + Hair -> Total height = 1.72m
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.21), skinMat);
    head.position.set(0.02, 1.54, 0);
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.23), hairMat);
    hair.position.set(0.01, 1.65, 0);
    group.add(hair);

    this.playerMesh = group;
    this.scene.add(group);
  }

  buildHijackRing() {
    const geo = new THREE.RingGeometry(2.1, 2.45, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide
    });
    this.hijackRing = new THREE.Mesh(geo, mat);
    this.hijackRing.rotation.x = -Math.PI / 2;
    this.hijackRing.position.y = 0.28;
    this.hijackRing.visible = false;
    this.scene.add(this.hijackRing);
  }

  /**
   * 1:1 Realistic Vehicle Proportions (in meters)
   */
  createVehicle3D(v) {
    const group = new THREE.Group();
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.8
    });
    const bodyMat = new THREE.MeshStandardMaterial({ color: v.bodyColor, roughness: 0.45 });
    const roofMat = new THREE.MeshStandardMaterial({ color: v.roofColor, roughness: 0.55 });
    const trimMat = new THREE.MeshStandardMaterial({ color: v.trimColor, roughness: 0.5 });

    const wheelRadius = v.id === "brtc" ? 0.52 : v.id === "rickshaw" ? 0.36 : 0.32;
    const wheelWidth = v.id === "brtc" ? 0.28 : v.id === "rickshaw" ? 0.08 : 0.2;

    const wheelPositions =
      v.id === "mishuk" || v.id === "rickshaw"
        ? [
            [v.length * 0.36, wheelRadius, 0],
            [-v.length * 0.32, wheelRadius, -v.width * 0.48],
            [-v.length * 0.32, wheelRadius, v.width * 0.48]
          ]
        : [
            [v.length * 0.31, wheelRadius, -v.width * 0.48],
            [v.length * 0.31, wheelRadius, v.width * 0.48],
            [-v.length * 0.31, wheelRadius, -v.width * 0.48],
            [-v.length * 0.31, wheelRadius, v.width * 0.48]
          ];

    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 14),
        wheelMat
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    }

    if (v.id === "brtc") {
      // Real 4.35m tall BRTC Double-Decker Bus
      const lowerDeck = new THREE.Mesh(
        new THREE.BoxGeometry(v.length, 1.85, v.width),
        bodyMat
      );
      lowerDeck.position.y = 1.35;
      lowerDeck.castShadow = true;
      group.add(lowerDeck);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(v.length + 0.04, 0.22, v.width + 0.04),
        trimMat
      );
      stripe.position.y = 2.35;
      group.add(stripe);

      const upperDeck = new THREE.Mesh(
        new THREE.BoxGeometry(v.length - 0.15, 1.8, v.width - 0.08),
        roofMat
      );
      upperDeck.position.y = 3.35;
      upperDeck.castShadow = true;
      group.add(upperDeck);

      const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.15, v.width - 0.3),
        glassMat
      );
      windshield.position.set(v.length / 2, 3.25, 0);
      group.add(windshield);
    } else if (v.id === "mishuk") {
      // Real 2.65m x 1.35m x 1.68m Mishuk Baby Taxi
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.86, 0.62, v.width),
        bodyMat
      );
      chassis.position.set(-0.15, 0.58, 0);
      chassis.castShadow = true;
      group.add(chassis);

      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.62, 0.82, v.width - 0.06),
        roofMat
      );
      canopy.position.set(-0.32, 1.26, 0);
      canopy.castShadow = true;
      group.add(canopy);
    } else if (v.id === "rickshaw") {
      // Real 2.35m x 1.15m x 1.78m Cycle Rickshaw + Puller (1.68m standing/pedaling)
      const carriage = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.52, 0.55, v.width),
        bodyMat
      );
      carriage.position.set(-0.5, 0.62, 0);
      carriage.castShadow = true;
      group.add(carriage);

      const hood = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.42, 0.86, v.width),
        roofMat
      );
      hood.position.set(-0.65, 1.32, 0);
      hood.castShadow = true;
      group.add(hood);

      const pullerBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.72, 0.38),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b })
      );
      pullerBody.position.set(0.45, 1.05, 0);
      group.add(pullerBody);

      const pullerHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.22, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xd99b66 })
      );
      pullerHead.position.set(0.48, 1.54, 0);
      group.add(pullerHead);
    } else {
      // Real '92 Toyota Corolla DX (1.38m H) & DMP Patrol Jeep (1.88m H)
      const lowerH = v.id === "police" ? 0.85 : 0.62;
      const cabinH = v.id === "police" ? 0.72 : 0.52;

      const lowerBody = new THREE.Mesh(
        new THREE.BoxGeometry(v.length, lowerH, v.width),
        bodyMat
      );
      lowerBody.position.y = 0.28 + lowerH / 2;
      lowerBody.castShadow = true;
      group.add(lowerBody);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.58, cabinH, v.width - 0.18),
        roofMat
      );
      cabin.position.set(-0.18, 0.28 + lowerH + cabinH / 2 - 0.04, 0);
      cabin.castShadow = true;
      group.add(cabin);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.6, cabinH * 0.74, v.width - 0.14),
        glassMat
      );
      glass.position.set(-0.18, 0.28 + lowerH + cabinH / 2 - 0.05, 0);
      group.add(glass);

      if (v.id === "police") {
        const beaconY = 0.28 + lowerH + cabinH + 0.05;
        const redBeacon = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.14, 0.36),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        redBeacon.position.set(-0.18, beaconY, -0.24);
        group.add(redBeacon);

        const blueBeacon = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.14, 0.36),
          new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
        );
        blueBeacon.position.set(-0.18, beaconY, 0.24);
        group.add(blueBeacon);

        this.sirenLights.push({ v, redBeacon, blueBeacon });
      }
    }

    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (const zOff of [-v.width * 0.32, v.width * 0.32]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.24), hlMat);
      hl.position.set(v.length / 2 + 0.01, 0.65, zOff);
      group.add(hl);
    }

    this.scene.add(group);
    return group;
  }

  renderWorld(cameraState, player, vehicles, elapsed) {
    this.playerMesh.visible = !player.inVehicle;
    if (!player.inVehicle) {
      this.playerMesh.position.set(player.x, 0.22, player.y);
      this.playerMesh.rotation.y = -player.angle;

      const swing = player.isMoving ? Math.sin(player.animTime) * 0.65 : 0;
      this.leftLeg.rotation.z = swing;
      this.rightLeg.rotation.z = -swing;
      this.leftArm.rotation.z = -swing * 0.8;
      this.rightArm.rotation.z = swing * 0.8;
    }

    for (const v of vehicles) {
      let mesh = this.vehicleMeshes.get(v);
      if (!mesh) {
        mesh = this.createVehicle3D(v);
        this.vehicleMeshes.set(v, mesh);
      }
      mesh.position.set(v.x, 0.22, v.y);
      mesh.rotation.y = -v.angle;
    }

    for (const s of this.sirenLights) {
      const flash = Math.sin(s.v.sirenPhase) > 0;
      s.redBeacon.material.color.setHex(flash ? 0xff2222 : 0x450a0a);
      s.blueBeacon.material.color.setHex(flash ? 0x172554 : 0x3b82f6);
    }

    for (const w of this.waterMeshes) {
      w.position.y = 0.06 + Math.sin(elapsed * 2.2) * 0.03;
    }

    this.hijackRing.visible = false;
    if (!player.inVehicle) {
      let nearest = null;
      let bestDist = 4.2;
      for (const v of vehicles) {
        const d = Math.hypot(v.x - player.x, v.y - player.y);
        if (d < bestDist) {
          bestDist = d;
          nearest = v;
        }
      }
      if (nearest) {
        this.hijackRing.visible = true;
        this.hijackRing.position.set(nearest.x, 0.28, nearest.y);
        const s = (nearest.length * 0.35) * (1 + Math.sin(elapsed * 8) * 0.06);
        this.hijackRing.scale.set(s, s, 1);
      }
    }

    this.sunLight.position.set(cameraState.targetX + 260, 420, cameraState.targetZ + 220);
    this.sunLight.target.position.set(cameraState.targetX, 0, cameraState.targetZ);
    this.sunLight.target.updateMatrixWorld();

    const dist = cameraState.distance;
    const pitch = cameraState.pitch;
    const yaw = cameraState.yaw;

    const horiz = dist * Math.cos(pitch);
    const camX = cameraState.targetX - Math.cos(yaw) * horiz;
    const camY = Math.max(1.5, dist * Math.sin(pitch));
    const camZ = cameraState.targetZ - Math.sin(yaw) * horiz;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(cameraState.targetX, 1.35, cameraState.targetZ);

    this.renderer.render(this.scene, this.camera);
  }

  renderMinimap(minimapCtx, player, vehicles) {
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

    for (const v of vehicles) {
      minimapCtx.fillStyle = v.id === "police" ? "#3b82f6" : "#9ca3af";
      minimapCtx.fillRect(v.x * sx - 1.5, v.y * sy - 1.5, 3, 3);
    }

    minimapCtx.save();
    minimapCtx.translate(player.x * sx, player.y * sy);
    minimapCtx.rotate(player.angle);
    minimapCtx.beginPath();
    minimapCtx.moveTo(5, 0);
    minimapCtx.lineTo(-3.5, -3);
    minimapCtx.lineTo(-3.5, 3);
    minimapCtx.closePath();
    minimapCtx.fillStyle = "#f59e0b";
    minimapCtx.fill();
    minimapCtx.restore();
  }
}
