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
 * Deterministic generator for Tejgaon industrial sheds, apartments, and greenery.
 * Keeps the exact coordinates shared with physics.js so 3D meshes match 2D AABBs 1:1.
 */
export function generateUrbanLayout() {
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

      const palette = [0x3b4252, 0x434c5e, 0x4c566a, 0x5c4738, 0x3b4d47, 0x523f49];
      const isWarehouse = rand() > 0.55;
      blocks.push({
        x: bx,
        y: by,
        w: bw,
        h: bh,
        height: isWarehouse ? 26 + rand() * 24 : 52 + rand() * 88,
        color: palette[Math.floor(rand() * palette.length)],
        hasWaterTank: !isWarehouse && rand() > 0.35
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
      r: 12 + rand() * 13
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

/**
 * Creates a crisp canvas texture for 3D building signs & landmark roofs
 */
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
  g.font = "bold 34px Consolas, monospace";
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
    // 1990s Dhaka late-afternoon warm golden haze
    this.scene.background = new THREE.Color(0x161d29);
    this.scene.fog = new THREE.FogExp2(0x1a2230, 0.00042);

    this.camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / window.innerHeight,
      5,
      6500
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
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x292524, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffedd5, 1.95);
    sun.position.set(1400, 1900, 1200);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 200;
    sun.shadow.camera.far = 5200;
    const d = 2200;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.sunLight = sun;
  }

  buildTerrainAndZones() {
    // Ground plane (World X = map X, World Y = elevation, World Z = map Y)
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

    // Distinct district ground pads
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
      mesh.position.set(z.x + z.w / 2, 0.25, z.y + z.h / 2);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }

    // Perimeter wall border
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    const h = 22;
    const t = 14;
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
        // Shape X -> world X, Shape Y -> -world Z after rotateX(-PI/2)
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
      mesh.position.y = 0.45;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.waterMeshes.push(mesh);

      // Hatirjheel promenade embankment wall
      const linePts = water.points.map((p) => new THREE.Vector3(p.x, 2.2, p.y));
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
      for (let i = 0; i < road.points.length - 1; i++) {
        const p1 = road.points[i];
        const p2 = road.points[i + 1];
        const dx = p2.x - p1.x;
        const dz = p2.y - p1.y;
        const len = Math.hypot(dx, dz);
        if (len < 1) continue;

        const angle = Math.atan2(dz, dx);
        const mx = (p1.x + p2.x) / 2;
        const mz = (p1.y + p2.y) / 2;

        // Raised sidewalk curb base
        const curbMesh = new THREE.Mesh(
          new THREE.BoxGeometry(len + road.width * 0.6, 1.2, road.width + 12),
          sidewalkMat
        );
        curbMesh.position.set(mx, 0.6, mz);
        curbMesh.rotation.y = -angle;
        curbMesh.receiveShadow = true;
        this.scene.add(curbMesh);

        // Asphalt surface
        const roadMesh = new THREE.Mesh(
          new THREE.BoxGeometry(len + road.width * 0.4, 1.5, road.width),
          asphaltMat
        );
        roadMesh.position.set(mx, 0.75, mz);
        roadMesh.rotation.y = -angle;
        roadMesh.receiveShadow = true;
        this.scene.add(roadMesh);

        // Dashed lane markings
        const dashStep = 44;
        const dashCount = Math.floor(len / dashStep);
        const dashMat = road.lanes === 4 ? yellowLineMat : whiteLineMat;
        for (let d = 0; d < dashCount; d++) {
          const t = (d + 0.5) / dashCount;
          const lx = p1.x + dx * t;
          const lz = p1.y + dz * t;
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(20, 2.4), dashMat);
          dash.rotation.x = -Math.PI / 2;
          dash.rotation.z = -angle;
          dash.position.set(lx, 1.58, lz);
          this.scene.add(dash);
        }

        // 3D Streetlamps along arterial roads
        if (road.type === "arterial" && len > 240) {
          const lampStep = 260;
          const lamps = Math.floor(len / lampStep);
          const nx = -dz / len;
          const nz = dx / len;
          for (let l = 1; l < lamps; l++) {
            const t = l / lamps;
            const side = l % 2 === 0 ? 1 : -1;
            const sx = p1.x + dx * t + nx * (road.width / 2 + 5) * side;
            const sz = p1.y + dz * t + nz * (road.width / 2 + 5) * side;

            const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 44, 6), poleMat);
            pole.position.set(sx, 22, sz);
            this.scene.add(pole);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 1.2), poleMat);
            arm.position.set(sx - nx * 4 * side, 43.5, sz - nz * 4 * side);
            arm.rotation.y = -angle;
            this.scene.add(arm);

            const lamp = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 2.5), bulbMat);
            lamp.position.set(sx - nx * 8 * side, 42.8, sz - nz * 8 * side);
            this.scene.add(lamp);
          }
        }
      }
    }

    // Dual-Gauge Tejgaon Railway Track
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

      const ballast = new THREE.Mesh(new THREE.BoxGeometry(len, 1.8, 28), ballastMat);
      ballast.position.set(mx, 0.9, mz);
      ballast.rotation.y = -angle;
      ballast.receiveShadow = true;
      this.scene.add(ballast);

      // Wooden sleepers
      const sleepers = Math.floor(len / 14);
      for (let s = 0; s < sleepers; s++) {
        const t = s / sleepers;
        const sl = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 22), sleeperMat);
        sl.position.set(p1.x + dx * t, 2.1, p1.y + dz * t);
        sl.rotation.y = -angle;
        this.scene.add(sl);
      }

      // Left & right steel rails
      for (const offset of [-6, 6]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 1.6, 1.6), railMat);
        rail.position.set(
          mx - Math.sin(angle) * offset,
          3.1,
          mz + Math.cos(angle) * offset
        );
        rail.rotation.y = -angle;
        this.scene.add(rail);
      }
    }
  }

  buildLandmarks() {
    const landmarkStyles = {
      hangar: { height: 68, color: 0x475569 },
      station: { height: 48, color: 0x7c2d12 },
      factory: { height: 74, color: 0x334155 },
      office: { height: 148, color: 0x1e3a5f },
      commercial: { height: 105, color: 0x581c87 },
      civic: { height: 84, color: 0x14532d },
      market: { height: 42, color: 0x78350f }
    };

    for (const lm of LANDMARKS) {
      const cx = lm.x + lm.w / 2;
      const cz = lm.y + lm.h / 2;

      if (lm.style === "runway") {
        const tarmac = new THREE.Mesh(
          new THREE.BoxGeometry(lm.w, 1.6, lm.h),
          new THREE.MeshStandardMaterial({ color: 0x333942, roughness: 0.85 })
        );
        tarmac.position.set(cx, 0.8, cz);
        tarmac.receiveShadow = true;
        this.scene.add(tarmac);

        // Runway centerline stripes
        for (let y = lm.y + 40; y < lm.y + lm.h - 40; y += 64) {
          const stripe = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 34),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc })
          );
          stripe.rotation.x = -Math.PI / 2;
          stripe.position.set(cx, 1.7, y);
          this.scene.add(stripe);
        }
        continue;
      }

      if (lm.style === "bridge") {
        // Elevated Hatirjheel Overpass Bridge Deck + Concrete Arch Ribs
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(lm.w + 30, 5, lm.h),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 })
        );
        deck.position.set(cx, 6, cz);
        deck.castShadow = true;
        deck.receiveShadow = true;
        this.scene.add(deck);

        for (const zOff of [-lm.h / 2 + 6, lm.h / 2 - 6]) {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(lm.w * 0.48, 3.2, 8, 24, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 })
          );
          arch.position.set(cx, 7, cz + zOff);
          arch.castShadow = true;
          this.scene.add(arch);
        }
        continue;
      }

      const spec = landmarkStyles[lm.style] || { height: 70, color: 0x374151 };
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(lm.w, spec.height, lm.h),
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.72 })
      );
      mesh.position.set(cx, spec.height / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      // Golden rooftop trim
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(lm.w + 4, 4, lm.h + 4),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
      );
      trim.position.set(cx, spec.height + 2, cz);
      this.scene.add(trim);

      // Rooftop Landmark Signboard
      const tex = makeSignTexture(lm.name);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(lm.w * 0.92, 190), 42),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
      );
      signMesh.position.set(cx, spec.height + 26, cz);
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

      // Rooftop parapet ledge
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(b.w + 2, 3, b.h + 2),
        parapetMat
      );
      roof.position.set(cx, b.height + 1.5, cz);
      this.scene.add(roof);

      // Classic Dhaka blue plastic rooftop water tank (Gazi Tank style)
      if (b.hasWaterTank) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 11, 10), tankMat);
        tank.position.set(cx + b.w * 0.18, b.height + 8, cz - b.h * 0.15);
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
        new THREE.CylinderGeometry(2.2, 3.4, 22, 6),
        trunkMat
      );
      trunk.position.y = 11;
      trunk.castShadow = true;
      group.add(trunk);

      const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(t.r, 1), leafMat1);
      crown1.position.y = 26;
      crown1.castShadow = true;
      group.add(crown1);

      const crown2 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(t.r * 0.72, 1),
        leafMat2
      );
      crown2.position.set(3, 34, -2);
      group.add(crown2);

      this.scene.add(group);
    }
  }

  buildPlayerMesh() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b66, roughness: 0.7 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

    // Legs
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(4.2, 11, 4.2), pantsMat);
    this.leftLeg.position.set(0, 5.5, -3);
    this.leftLeg.castShadow = true;
    group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(4.2, 11, 4.2), pantsMat);
    this.rightLeg.position.set(0, 5.5, 3);
    this.rightLeg.castShadow = true;
    group.add(this.rightLeg);

    // 90s Denim Jacket Torso (+X is forward heading)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 12), jacketMat);
    torso.position.set(0, 16.5, 0);
    torso.castShadow = true;
    group.add(torso);

    // Arms
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 10, 3.6), jacketMat);
    this.leftArm.position.set(0, 16.5, -8);
    this.leftArm.castShadow = true;
    group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 10, 3.6), jacketMat);
    this.rightArm.position.set(0, 16.5, 8);
    this.rightArm.castShadow = true;
    group.add(this.rightArm);

    // Head + Hair
    const head = new THREE.Mesh(new THREE.BoxGeometry(7.2, 7.5, 7.2), skinMat);
    head.position.set(0.5, 26.5, 0);
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.2, 7.6), hairMat);
    hair.position.set(0.2, 29.5, 0);
    group.add(hair);

    this.playerMesh = group;
    this.scene.add(group);
  }

  buildHijackRing() {
    const geo = new THREE.RingGeometry(24, 28, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide
    });
    this.hijackRing = new THREE.Mesh(geo, mat);
    this.hijackRing.rotation.x = -Math.PI / 2;
    this.hijackRing.position.y = 2.1;
    this.hijackRing.visible = false;
    this.scene.add(this.hijackRing);
  }

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

    // Wheels (+X is forward, Z is width)
    const wheelPositions =
      v.id === "mishuk" || v.id === "rickshaw"
        ? [
            [v.length * 0.34, 4, 0],
            [-v.length * 0.32, 4, -v.width * 0.48],
            [-v.length * 0.32, 4, v.width * 0.48]
          ]
        : [
            [v.length * 0.3, 4.5, -v.width * 0.48],
            [v.length * 0.3, 4.5, v.width * 0.48],
            [-v.length * 0.3, 4.5, -v.width * 0.48],
            [-v.length * 0.3, 4.5, v.width * 0.48]
          ];

    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 3, 12), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    }

    if (v.id === "brtc") {
      // Tall Red BRTC Double-Decker Bus
      const lowerDeck = new THREE.Mesh(
        new THREE.BoxGeometry(v.length, 14, v.width),
        bodyMat
      );
      lowerDeck.position.y = 11;
      lowerDeck.castShadow = true;
      group.add(lowerDeck);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(v.length + 0.6, 2.5, v.width + 0.6),
        trimMat
      );
      stripe.position.y = 18.5;
      group.add(stripe);

      const upperDeck = new THREE.Mesh(
        new THREE.BoxGeometry(v.length - 2, 13, v.width - 1),
        roofMat
      );
      upperDeck.position.y = 26;
      upperDeck.castShadow = true;
      group.add(upperDeck);

      const windshield = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 9, v.width - 4),
        glassMat
      );
      windshield.position.set(v.length / 2, 24, 0);
      group.add(windshield);
    } else if (v.id === "mishuk") {
      // Iconic Green & Yellow 3-Wheeler Baby Taxi
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.85, 7, v.width),
        bodyMat
      );
      chassis.position.set(-2, 7.5, 0);
      chassis.castShadow = true;
      group.add(chassis);

      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.62, 11, v.width - 1),
        roofMat
      );
      canopy.position.set(-4, 15.5, 0);
      canopy.castShadow = true;
      group.add(canopy);
    } else if (v.id === "rickshaw") {
      // Dhaka Cycle Rickshaw + Colorful Hood + Puller
      const carriage = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.55, 7, v.width),
        bodyMat
      );
      carriage.position.set(-6, 7.5, 0);
      carriage.castShadow = true;
      group.add(carriage);

      const hood = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.42, 11, v.width),
        roofMat
      );
      hood.position.set(-8, 15.5, 0);
      hood.castShadow = true;
      group.add(hood);

      const puller = new THREE.Mesh(
        new THREE.BoxGeometry(6, 12, 7),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b })
      );
      puller.position.set(8, 11, 0);
      group.add(puller);
    } else {
      // '92 Toyota Corolla DX & DMP Police Jeep
      const lowerBody = new THREE.Mesh(
        new THREE.BoxGeometry(v.length, 8.5, v.width),
        bodyMat
      );
      lowerBody.position.y = 8;
      lowerBody.castShadow = true;
      group.add(lowerBody);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.56, 7.5, v.width - 2.5),
        roofMat
      );
      cabin.position.set(-2, 15.5, 0);
      cabin.castShadow = true;
      group.add(cabin);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(v.length * 0.58, 5.5, v.width - 2),
        glassMat
      );
      glass.position.set(-2, 15.2, 0);
      group.add(glass);

      // DMP Police Jeep flashing red/blue lightbar
      if (v.id === "police") {
        const redBeacon = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 2.5, 5),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        redBeacon.position.set(-2, 20.5, -3.5);
        group.add(redBeacon);

        const blueBeacon = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 2.5, 5),
          new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
        );
        blueBeacon.position.set(-2, 20.5, 3.5);
        group.add(blueBeacon);

        this.sirenLights.push({ v, redBeacon, blueBeacon });
      }
    }

    // Glowing Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (const zOff of [-v.width * 0.32, v.width * 0.32]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 3.2), hlMat);
      hl.position.set(v.length / 2 + 0.2, 8.5, zOff);
      group.add(hl);
    }

    this.scene.add(group);
    return group;
  }

  renderWorld(cameraState, player, vehicles, elapsed) {
    // Sync 3D Player Mesh
    this.playerMesh.visible = !player.inVehicle;
    if (!player.inVehicle) {
      this.playerMesh.position.set(player.x, 0, player.y);
      this.playerMesh.rotation.y = -player.angle;

      const swing = player.isMoving ? Math.sin(player.animTime) * 0.65 : 0;
      this.leftLeg.rotation.z = swing;
      this.rightLeg.rotation.z = -swing;
      this.leftArm.rotation.z = -swing * 0.8;
      this.rightArm.rotation.z = swing * 0.8;
    }

    // Sync 3D Vehicle Meshes
    for (const v of vehicles) {
      let mesh = this.vehicleMeshes.get(v);
      if (!mesh) {
        mesh = this.createVehicle3D(v);
        this.vehicleMeshes.set(v, mesh);
      }
      mesh.position.set(v.x, 0, v.y);
      mesh.rotation.y = -v.angle;
    }

    // Pulse DMP Police Beacons
    for (const s of this.sirenLights) {
      const flash = Math.sin(s.v.sirenPhase) > 0;
      s.redBeacon.material.color.setHex(flash ? 0xff2222 : 0x450a0a);
      s.blueBeacon.material.color.setHex(flash ? 0x172554 : 0x3b82f6);
    }

    // Subtle Hatirjheel water shimmer
    for (const w of this.waterMeshes) {
      w.position.y = 0.45 + Math.sin(elapsed * 2.2) * 0.14;
    }

    // Highlight nearest hijackable vehicle
    this.hijackRing.visible = false;
    if (!player.inVehicle) {
      let nearest = null;
      let bestDist = 68;
      for (const v of vehicles) {
        const d = Math.hypot(v.x - player.x, v.y - player.y);
        if (d < bestDist) {
          bestDist = d;
          nearest = v;
        }
      }
      if (nearest) {
        this.hijackRing.visible = true;
        this.hijackRing.position.set(nearest.x, 2.2, nearest.y);
        const s = 1 + Math.sin(elapsed * 8) * 0.08;
        this.hijackRing.scale.set(s, s, 1);
      }
    }

    // Keep directional sun frustum centered near camera target for crisp shadows
    this.sunLight.position.set(cameraState.targetX + 900, 1600, cameraState.targetZ + 800);
    this.sunLight.target.position.set(cameraState.targetX, 0, cameraState.targetZ);
    this.sunLight.target.updateMatrixWorld();

    // Update 3D Camera Position & LookAt
    const dist = cameraState.distance;
    const pitch = cameraState.pitch;
    const yaw = cameraState.yaw;

    const horiz = dist * Math.cos(pitch);
    const camX = cameraState.targetX - Math.cos(yaw) * horiz;
    const camY = Math.max(24, dist * Math.sin(pitch));
    const camZ = cameraState.targetZ - Math.sin(yaw) * horiz;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(cameraState.targetX, 14, cameraState.targetZ);

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

    // Player heading arrow
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
