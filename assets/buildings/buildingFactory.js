/**
 * High-Detail, GPU-Instanced 1:1 Metric 3D Building Asset Builders for DHAKA '96
 *
 * Architectural & Optimization Highlights:
 *   - Shared Geometry & Material Pool (zero duplicate buffers)
 *   - BuildingInstanceBatcher: batches thousands of repetitive 3D details (Gazi blue water tanks,
 *     tank pedestals, window AC compressor units, concrete sunshade chajjas, rooftop stairhead
 *     penthouses, TV antennas, cargo crates, and industrial oil drums) into 8 GPU InstancedMeshes!
 *   - Distance LOD Detail Groups (`userData.detailGroup`) so sub-details beyond 420m auto-cull.
 *   - Rich Dhaka Archetypes:
 *       1. Dhaka Mid-Rise Residential / Commercial Building (balconies, chajjas, ACs, awnings, tanks)
 *       2. Tejgaon Industrial Factory (sawtooth skylights, brick pilasters, exhaust stacks, loading dock)
 *       3. Tejgaon Railway Station (raised platform, ticket hall, double-pitched steel canopy, signs)
 *       4. BAF Old Airport Hangar (buttressed concrete walls, barrel-vault roof, sliding doors)
 *       5. Corporate / Civic High-Rise (podium + tower, brise-soleil fins, helipad "H", telecom spire)
 *       6. Kawran Bazar Wholesale Complex (colonnade market hall, wholesale crates & signage)
 *       7. Functional Interactive Buildings (Auto Workshop, Hotel Niribili Safehouse, Dhaka Care Clinic)
 */
import * as THREE from "three";
import {
  getApartmentFacadeTexture,
  getApartmentEmissiveTexture,
  getIndustrialFacadeTexture,
  getRooftopTexture,
  getShopfrontTexture,
  getLandmarkSignTexture,
  getHelipadTexture
} from "./buildingTextures.js";

// Shared Geometry Pool
const GEO = {
  unitBox: new THREE.BoxGeometry(1, 1, 1),
  waterTank: new THREE.CylinderGeometry(0.62, 0.62, 1.55, 12),
  antennaMast: new THREE.CylinderGeometry(0.04, 0.06, 3.6, 6),
  oilDrum: new THREE.CylinderGeometry(0.32, 0.32, 0.92, 10),
  column: new THREE.CylinderGeometry(0.22, 0.26, 1, 8),
  chimney: new THREE.CylinderGeometry(0.35, 0.45, 4.2, 10),
  spire: new THREE.CylinderGeometry(0.18, 0.55, 11, 8),
  helipadPlane: new THREE.PlaneGeometry(1, 1)
};

// Shared Material Pool
const MAT = {
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }),
  concreteTrim: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }),
  concreteLight: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.35 }),
  steelSilver: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 }),
  waterTankBlue: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.36, metalness: 0.15 }),
  acUnitWhite: new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.55 }),
  crateWood: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.88 }),
  drumRed: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5, metalness: 0.4 }),
  awningGreen: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }),
  awningAmber: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 }),
  medicalRed: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  beaconRed: new THREE.MeshBasicMaterial({ color: 0xff2222 })
};

const apartmentMatCache = new Map();
function getApartmentWallMaterial(hexColor, stories) {
  const key = `${hexColor}_${stories}`;
  if (apartmentMatCache.has(key)) return apartmentMatCache.get(key);
  const mat = new THREE.MeshStandardMaterial({
    map: getApartmentFacadeTexture(hexColor, stories),
    emissiveMap: getApartmentEmissiveTexture(stories),
    emissive: new THREE.Color(0xfbbf24),
    emissiveIntensity: 0.48,
    roughness: 0.82
  });
  apartmentMatCache.set(key, mat);
  return mat;
}

/**
 * Collects world-space transform matrices for repeated 3D architectural details
 * across all buildings and flushes them into a handful of GPU InstancedMeshes.
 */
export class BuildingInstanceBatcher {
  constructor() {
    this.buckets = {
      waterTanks: [],
      tankStands: [],
      penthouses: [],
      acUnits: [],
      sunshades: [],
      antennas: [],
      crates: [],
      oilDrums: []
    };
    this._dummy = new THREE.Object3D();
  }

  add(bucketName, x, y, z, sx = 1, sy = 1, sz = 1, rotY = 0) {
    this._dummy.position.set(x, y, z);
    this._dummy.rotation.set(0, rotY, 0);
    this._dummy.scale.set(sx, sy, sz);
    this._dummy.updateMatrix();
    this.buckets[bucketName].push(this._dummy.matrix.clone());
  }

  flushToScene(scene) {
    const specs = [
      { key: "waterTanks", geo: GEO.waterTank, mat: MAT.waterTankBlue, shadow: true },
      { key: "tankStands", geo: GEO.unitBox, mat: MAT.concreteTrim, shadow: false },
      { key: "penthouses", geo: GEO.unitBox, mat: MAT.concreteDark, shadow: true },
      { key: "acUnits", geo: GEO.unitBox, mat: MAT.acUnitWhite, shadow: false },
      { key: "sunshades", geo: GEO.unitBox, mat: MAT.concreteLight, shadow: false },
      { key: "antennas", geo: GEO.antennaMast, mat: MAT.steelSilver, shadow: false },
      { key: "crates", geo: GEO.unitBox, mat: MAT.crateWood, shadow: true },
      { key: "oilDrums", geo: GEO.oilDrum, mat: MAT.drumRed, shadow: false }
    ];

    for (const s of specs) {
      const matrices = this.buckets[s.key];
      if (!matrices || matrices.length === 0) continue;

      const im = new THREE.InstancedMesh(s.geo, s.mat, matrices.length);
      im.castShadow = s.shadow;
      im.receiveShadow = true;
      for (let i = 0; i < matrices.length; i++) {
        im.setMatrixAt(i, matrices[i]);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
  }
}

/**
 * Adds perimeter parapets, stairhead penthouse, blue Gazi water tank, TV antenna & optional billboard
 */
function populateRooftop(group, detailGroup, wx, wz, w, h, d, batcher, options = {}) {
  const { hasWaterTank = true, hasPenthouse = true, hasBillboard = false, signText = "" } = options;

  // Perimeter concrete parapet (grouped in detailGroup for distance LOD culling)
  const parapetH = 0.92;
  const parapetT = 0.35;
  const walls = [
    [w + parapetT, parapetH, parapetT, 0, h + parapetH / 2, d / 2],
    [w + parapetT, parapetH, parapetT, 0, h + parapetH / 2, -d / 2],
    [parapetT, parapetH, d, w / 2, h + parapetH / 2, 0],
    [parapetT, parapetH, d, -w / 2, h + parapetH / 2, 0]
  ];
  for (const [pw, ph, pd, px, py, pz] of walls) {
    const m = new THREE.Mesh(GEO.unitBox, MAT.concreteTrim);
    m.scale.set(pw, ph, pd);
    m.position.set(px, py, pz);
    detailGroup.add(m);
  }

  // Batched Rooftop Stairhead Room (Chhat-er Ghor)
  if (hasPenthouse && w > 10 && d > 10 && batcher) {
    const phW = Math.min(4.2, w * 0.26);
    const phD = Math.min(3.6, d * 0.24);
    const phH = 2.5;
    batcher.add("penthouses", wx - w * 0.22, h + phH / 2, wz - d * 0.2, phW, phH, phD);
  }

  // Batched 1,500L Blue Dhaka Water Tank on Concrete Stand
  if (hasWaterTank && batcher) {
    const tx = wx + w * 0.22;
    const tz = wz + d * 0.18;
    batcher.add("tankStands", tx, h + 0.35, tz, 1.45, 0.7, 1.45);
    batcher.add("waterTanks", tx, h + 1.48, tz, 1, 1, 1);
  }

  // Batched VHF/UHF Rooftop TV Antenna
  if (h > 10 && w > 12 && batcher) {
    batcher.add("antennas", wx + w * 0.28, h + 1.8, wz - d * 0.26, 1, 1, 1);
  }

  // Landmark Billboard
  if (hasBillboard && signText) {
    const signW = Math.min(w * 0.88, 28);
    const signH = signW * 0.24;
    const tex = getLandmarkSignTexture(signText);

    for (const xOff of [-signW * 0.32, signW * 0.32]) {
      const post = new THREE.Mesh(GEO.unitBox, MAT.steelDark);
      post.scale.set(0.28, signH + 1.4, 0.28);
      post.position.set(xOff, h + (signH + 1.4) / 2, 0);
      group.add(post);
    }

    const board = new THREE.Mesh(GEO.unitBox, new THREE.MeshBasicMaterial({ map: tex }));
    board.scale.set(signW, signH, 0.36);
    board.position.set(0, h + signH * 0.5 + 1.1, 0);
    group.add(board);
  }
}

/**
 * 1. Detailed Dhaka Mid-Rise Residential / Commercial Building
 */
export function createDhakaApartmentBuilding(spec, batcher) {
  const { x, y, w, h: d, height: H, color = 0x4b5563, hasWaterTank = true } = spec;
  const wx = x + w / 2;
  const wz = y + d / 2;

  const group = new THREE.Group();
  group.position.set(wx, 0, wz);

  const detailGroup = new THREE.Group();
  group.userData.detailGroup = detailGroup;
  group.add(detailGroup);

  const stories = Math.max(2, Math.round(H / 3.2));
  const hexColor = `#${new THREE.Color(color).getHexString()}`;
  const wallMat = getApartmentWallMaterial(hexColor, stories);
  const roofMat = new THREE.MeshStandardMaterial({ map: getRooftopTexture(false), roughness: 0.88 });

  const body = new THREE.Mesh(
    GEO.unitBox,
    [wallMat, wallMat, roofMat, MAT.concreteDark, wallMat, wallMat]
  );
  body.scale.set(w, H, d);
  body.position.y = H / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Ground-floor Dhaka shopfront shutters + canvas/tin awning
  const shopNames = [
    "BISMILLAH STORE",
    "TEJGAON HARDWARE",
    "JANATA PHARMACY",
    "DHAKA MOTORS",
    "AL-MADINA HOTEL",
    "SONARGAON TRADERS"
  ];
  const shopName = shopNames[Math.abs(Math.round(x + y)) % shopNames.length];
  const shopMat = new THREE.MeshStandardMaterial({
    map: getShopfrontTexture(shopName, "#f59e0b", "shop"),
    roughness: 0.7
  });

  const shopBand = new THREE.Mesh(GEO.unitBox, shopMat);
  shopBand.scale.set(w - 0.5, 3.1, 0.24);
  shopBand.position.set(0, 1.55, d / 2 + 0.08);
  detailGroup.add(shopBand);

  const awning = new THREE.Mesh(
    GEO.unitBox,
    Math.round(x) % 2 === 0 ? MAT.awningGreen : MAT.awningAmber
  );
  awning.scale.set(w - 0.4, 0.14, 1.35);
  awning.position.set(0, 3.15, d / 2 + 0.65);
  awning.rotation.x = 0.22;
  detailGroup.add(awning);

  // Projecting balconies + instanced window chajja sunshades & AC compressor units
  const floorH = H / stories;
  const balcW = Math.min(4.4, w * 0.34);

  for (let s = 1; s < stories; s++) {
    const by = s * floorH;

    if (stories >= 3 && w >= 12) {
      const slab = new THREE.Mesh(GEO.unitBox, MAT.concreteTrim);
      slab.scale.set(balcW, 0.22, 1.15);
      slab.position.set(0, by, d / 2 + 0.55);
      detailGroup.add(slab);

      const rail = new THREE.Mesh(GEO.unitBox, MAT.steelDark);
      rail.scale.set(balcW, 0.95, 0.08);
      rail.position.set(0, by + 0.52, d / 2 + 1.08);
      detailGroup.add(rail);
    }

    if (batcher) {
      // Concrete chajja window sunshades on front & rear
      batcher.add("sunshades", wx - w * 0.28, by + floorH * 0.78, wz + d / 2 + 0.26, 2.2, 0.14, 0.52);
      batcher.add("sunshades", wx + w * 0.28, by + floorH * 0.78, wz + d / 2 + 0.26, 2.2, 0.14, 0.52);

      // Wall-mounted AC compressor box every 2nd floor
      if (s % 2 === 0) {
        batcher.add("acUnits", wx + w * 0.32, by + 0.55, wz + d / 2 + 0.28, 0.78, 0.54, 0.38);
      }
    }
  }

  populateRooftop(group, detailGroup, wx, wz, w, H, d, batcher, {
    hasWaterTank,
    hasPenthouse: true
  });
  return group;
}

/**
 * 2. Detailed Tejgaon Industrial Factory / Warehouse (Sawtooth Skylight Roof + Pilasters + Stacks)
 */
export function createTejgaonFactoryBuilding(spec, batcher) {
  const { x, y, w, h: d, height: H = 9.5, name = "" } = spec;
  const wx = x + w / 2;
  const wz = y + d / 2;

  const group = new THREE.Group();
  group.position.set(wx, 0, wz);

  const detailGroup = new THREE.Group();
  group.userData.detailGroup = detailGroup;
  group.add(detailGroup);

  const wallMat = new THREE.MeshStandardMaterial({
    map: getIndustrialFacadeTexture(),
    roughness: 0.78
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: getRooftopTexture(true),
    roughness: 0.55,
    metalness: 0.35
  });

  const baseH = H * 0.78;
  const body = new THREE.Mesh(
    GEO.unitBox,
    [wallMat, wallMat, roofMat, MAT.concreteDark, wallMat, wallMat]
  );
  body.scale.set(w, baseH, d);
  body.position.y = baseH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Exterior structural brick/concrete pilasters along factory walls
  for (const xOff of [-w * 0.48, 0, w * 0.48]) {
    const pilaster = new THREE.Mesh(GEO.unitBox, MAT.concreteDark);
    pilaster.scale.set(0.55, baseH, d + 0.45);
    pilaster.position.set(xOff, baseH / 2, 0);
    detailGroup.add(pilaster);
  }

  // Sawtooth / stepped industrial skylight roof ridge
  const ridgeH = H * 0.24;
  const roofCap = new THREE.Mesh(GEO.unitBox, roofMat);
  roofCap.scale.set(w + 0.8, ridgeH, d * 0.62);
  roofCap.position.y = baseH + ridgeH / 2;
  roofCap.castShadow = true;
  group.add(roofCap);

  // Twin steel exhaust chimneys
  for (const xOff of [-w * 0.28, w * 0.28]) {
    const pipe = new THREE.Mesh(GEO.chimney, MAT.steelDark);
    pipe.position.set(xOff, baseH + ridgeH + 1.8, -d * 0.18);
    detailGroup.add(pipe);
  }

  // Concrete loading dock + instanced cargo crates & red industrial oil drums
  const dock = new THREE.Mesh(GEO.unitBox, MAT.concreteTrim);
  dock.scale.set(Math.min(8.5, w * 0.46), 0.85, 2.2);
  dock.position.set(0, 0.425, d / 2 + 1.0);
  dock.receiveShadow = true;
  detailGroup.add(dock);

  if (batcher) {
    batcher.add("crates", wx - 1.5, 1.4, wz + d / 2 + 1.1, 1.25, 1.1, 1.25);
    batcher.add("crates", wx - 0.2, 1.35, wz + d / 2 + 1.0, 1.0, 1.0, 1.0, 0.3);
    batcher.add("oilDrums", wx + 1.6, 1.31, wz + d / 2 + 1.1, 1, 1, 1);
    batcher.add("oilDrums", wx + 2.3, 1.31, wz + d / 2 + 0.9, 1, 1, 1);
  }

  if (name) {
    populateRooftop(group, detailGroup, wx, wz, w, baseH + ridgeH, d, batcher, {
      hasWaterTank: false,
      hasPenthouse: false,
      hasBillboard: true,
      signText: name
    });
  }

  return group;
}

/**
 * 3. Tejgaon Railway Station & Covered Platform Canopy
 */
export function createRailwayStationAsset(lm) {
  const { x, y, w, h: d, name } = lm;
  const group = new THREE.Group();
  group.position.set(x + w / 2, 0, y + d / 2);

  const platform = new THREE.Mesh(
    GEO.unitBox,
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.88 })
  );
  platform.scale.set(w, 0.9, d);
  platform.position.y = 0.45;
  platform.receiveShadow = true;
  group.add(platform);

  // Yellow platform safety edge strip
  const edgeStrip = new THREE.Mesh(
    GEO.unitBox,
    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
  );
  edgeStrip.scale.set(0.35, 0.06, d);
  edgeStrip.position.set(-w / 2 + 0.25, 0.92, 0);
  group.add(edgeStrip);

  const ticketOffice = new THREE.Mesh(
    GEO.unitBox,
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 })
  );
  ticketOffice.scale.set(w * 0.58, 4.8, d * 0.45);
  ticketOffice.position.set(2.5, 0.9 + 2.4, 0);
  ticketOffice.castShadow = true;
  group.add(ticketOffice);

  const canopy = new THREE.Mesh(GEO.unitBox, MAT.steelSilver);
  canopy.scale.set(w * 0.95, 0.45, d * 0.86);
  canopy.position.set(0, 6.2, 0);
  canopy.castShadow = true;
  group.add(canopy);

  for (let z = -d * 0.38; z <= d * 0.38; z += 14) {
    const col = new THREE.Mesh(GEO.column, MAT.steelDark);
    col.scale.set(1, 5.4, 1);
    col.position.set(-w * 0.32, 3.6, z);
    group.add(col);
  }

  const signTex = getLandmarkSignTexture(name, "#facc15", "#0f172a", "#0f172a");
  const sign = new THREE.Mesh(GEO.unitBox, new THREE.MeshBasicMaterial({ map: signTex }));
  sign.scale.set(1.2, 2.4, 14);
  sign.position.set(-w * 0.42, 7.6, 0);
  group.add(sign);

  return group;
}

/**
 * 4. BAF Old Airport Curved Hangar
 */
export function createAirportHangarAsset(lm, batcher) {
  const { x, y, w, h: d, name } = lm;
  const wx = x + w / 2;
  const wz = y + d / 2;
  const group = new THREE.Group();
  group.position.set(wx, 0, wz);

  const detailGroup = new THREE.Group();
  group.userData.detailGroup = detailGroup;
  group.add(detailGroup);

  const wallH = 8.5;
  const walls = new THREE.Mesh(GEO.unitBox, MAT.concreteDark);
  walls.scale.set(w, wallH, d);
  walls.position.y = wallH / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const archGeo = new THREE.CylinderGeometry(w / 2, w / 2, d, 20, 1, false, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  archGeo.rotateY(Math.PI / 2);
  const archRoof = new THREE.Mesh(archGeo, MAT.steelSilver);
  archRoof.scale.set(1, 0.36, 1);
  archRoof.position.y = wallH;
  archRoof.castShadow = true;
  group.add(archRoof);

  const door = new THREE.Mesh(GEO.unitBox, MAT.steelDark);
  door.scale.set(w * 0.76, wallH - 0.8, 0.4);
  door.position.set(0, (wallH - 0.8) / 2, d / 2 + 0.15);
  group.add(door);

  populateRooftop(group, detailGroup, wx, wz, w, wallH + w * 0.18, d, batcher, {
    hasWaterTank: false,
    hasPenthouse: false,
    hasBillboard: true,
    signText: name
  });

  return group;
}

/**
 * 5. Landmark Corporate / Civic High-Rise (WASA Bhaban, Media Bhaban, Farmgate Plaza, Khamarbari)
 *    Includes ground podium, brise-soleil vertical sun-fins, rooftop Helipad "H" & telecom spire.
 */
export function createLandmarkHighRiseAsset(lm, batcher) {
  const { x, y, w, h: d, style, name } = lm;
  const wx = x + w / 2;
  const wz = y + d / 2;
  const heights = { office: 44, commercial: 28, civic: 20 };
  const colors = { office: "#1e3a5f", commercial: "#4c1d95", civic: "#14532d" };

  const H = heights[style] || 24;
  const group = new THREE.Group();
  group.position.set(wx, 0, wz);

  const detailGroup = new THREE.Group();
  group.userData.detailGroup = detailGroup;
  group.add(detailGroup);

  const stories = Math.round(H / 3.4);
  const wallMat = getApartmentWallMaterial(colors[style] || "#334155", stories);
  const roofMat = new THREE.MeshStandardMaterial({ map: getRooftopTexture(false), roughness: 0.85 });

  const podiumH = 6.5;
  const podium = new THREE.Mesh(
    GEO.unitBox,
    [wallMat, wallMat, roofMat, MAT.concreteDark, wallMat, wallMat]
  );
  podium.scale.set(w, podiumH, d);
  podium.position.y = podiumH / 2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  const towerW = w * 0.86;
  const towerD = d * 0.86;
  const towerH = H - podiumH;
  const tower = new THREE.Mesh(
    GEO.unitBox,
    [wallMat, wallMat, roofMat, MAT.concreteDark, wallMat, wallMat]
  );
  tower.scale.set(towerW, towerH, towerD);
  tower.position.y = podiumH + towerH / 2;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // Vertical concrete brise-soleil architectural fins on tower faces
  for (const xOff of [-towerW * 0.34, 0, towerW * 0.34]) {
    const fin = new THREE.Mesh(GEO.unitBox, MAT.concreteLight);
    fin.scale.set(0.45, towerH, towerD + 0.65);
    fin.position.set(xOff, podiumH + towerH / 2, 0);
    detailGroup.add(fin);
  }

  // Rooftop Helipad ("H") on tall corporate/commercial towers
  if (towerW >= 18 && towerD >= 18) {
    const padSize = Math.min(towerW, towerD) * 0.68;
    const helipad = new THREE.Mesh(
      GEO.helipadPlane,
      new THREE.MeshStandardMaterial({ map: getHelipadTexture(), roughness: 0.75 })
    );
    helipad.rotation.x = -Math.PI / 2;
    helipad.scale.set(padSize, padSize, 1);
    helipad.position.set(0, H + 0.06, 0);
    detailGroup.add(helipad);
  }

  if (style === "office") {
    const spire = new THREE.Mesh(GEO.spire, MAT.steelSilver);
    spire.position.set(-towerW * 0.32, H + 5.5, -towerD * 0.32);
    group.add(spire);

    const beacon = new THREE.Mesh(GEO.unitBox, MAT.beaconRed);
    beacon.scale.set(0.45, 0.45, 0.45);
    beacon.position.set(-towerW * 0.32, H + 11.2, -towerD * 0.32);
    group.add(beacon);
  }

  populateRooftop(group, detailGroup, wx, wz, towerW, H, towerD, batcher, {
    hasWaterTank: true,
    hasPenthouse: false,
    hasBillboard: true,
    signText: name
  });

  return group;
}

/**
 * 6. Kawran Bazar Wholesale Market Complex
 */
export function createWholesaleMarketAsset(lm, batcher) {
  const { x, y, w, h: d, name } = lm;
  const wx = x + w / 2;
  const wz = y + d / 2;
  const group = new THREE.Group();
  group.position.set(wx, 0, wz);

  const detailGroup = new THREE.Group();
  group.userData.detailGroup = detailGroup;
  group.add(detailGroup);

  const hallH = 7.2;
  const wallMat = new THREE.MeshStandardMaterial({
    map: getShopfrontTexture("KAWRAN BAZAR WHOLESALE", "#f59e0b", "shop"),
    roughness: 0.85
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: getRooftopTexture(true),
    roughness: 0.65
  });

  const hall = new THREE.Mesh(
    GEO.unitBox,
    [wallMat, wallMat, roofMat, MAT.concreteDark, wallMat, wallMat]
  );
  hall.scale.set(w, hallH, d);
  hall.position.y = hallH / 2;
  hall.castShadow = true;
  hall.receiveShadow = true;
  group.add(hall);

  if (batcher) {
    for (let i = -3; i <= 3; i++) {
      batcher.add("crates", wx + i * 6, 0.55, wz + d / 2 + 1.1, 1.4, 1.1, 1.4);
    }
  }

  populateRooftop(group, detailGroup, wx, wz, w, hallH, d, batcher, {
    hasWaterTank: false,
    hasPenthouse: false,
    hasBillboard: true,
    signText: name
  });

  return group;
}

/**
 * 7. Dedicated Functional Building Archetypes:
 *    - "workshop": Tejgaon Auto Workshop (Pay 'n' Spray style repair & respray garage)
 *    - "safehouse": Hotel Niribili (Player rest, full heal & save point)
 *    - "clinic": Dhaka Care Pharmacy & Clinic (Medical healing station)
 */
export function createFunctionalBuildingAsset(fb, batcher) {
  const { x, y, w, h: d, role, name } = fb;
  const wx = x + w / 2;
  const wz = y + d / 2;
  const group = new THREE.Group();
  group.position.set(wx, 0, wz);

  const detailGroup = new THREE.Group();
  group.userData.detailGroup = detailGroup;
  group.add(detailGroup);

  if (role === "workshop") {
    const H = 6.8;
    const wallMat = new THREE.MeshStandardMaterial({
      map: getShopfrontTexture("TEJGAON AUTO WORKSHOP", "#38bdf8", "workshop"),
      roughness: 0.72
    });
    const roofMat = new THREE.MeshStandardMaterial({
      map: getRooftopTexture(true),
      roughness: 0.55
    });

    const garage = new THREE.Mesh(
      GEO.unitBox,
      [wallMat, wallMat, roofMat, MAT.concreteDark, wallMat, wallMat]
    );
    garage.scale.set(w, H, d);
    garage.position.y = H / 2;
    garage.castShadow = true;
    garage.receiveShadow = true;
    group.add(garage);

    // Projecting steel service bay canopy
    const canopy = new THREE.Mesh(GEO.unitBox, MAT.steelSilver);
    canopy.scale.set(w + 1.2, 0.35, 4.2);
    canopy.position.set(0, 4.6, d / 2 + 2.0);
    canopy.castShadow = true;
    group.add(canopy);

    if (batcher) {
      batcher.add("oilDrums", wx - w * 0.36, 0.46, wz + d / 2 + 1.5, 1, 1, 1);
      batcher.add("oilDrums", wx + w * 0.36, 0.46, wz + d / 2 + 1.5, 1, 1, 1);
    }

    populateRooftop(group, detailGroup, wx, wz, w, H, d, batcher, {
      hasWaterTank: false,
      hasPenthouse: false,
      hasBillboard: true,
      signText: name
    });
    return group;
  }

  if (role === "clinic") {
    const H = 9.6;
    const wallMat = new THREE.MeshStandardMaterial({
      map: getShopfrontTexture("DHAKA CARE CLINIC & PHARMACY", "#10b981", "clinic"),
      roughness: 0.7
    });
    const roofMat = new THREE.MeshStandardMaterial({
      map: getRooftopTexture(false),
      roughness: 0.85
    });

    const clinic = new THREE.Mesh(
      GEO.unitBox,
      [wallMat, wallMat, roofMat, MAT.concreteDark, wallMat, wallMat]
    );
    clinic.scale.set(w, H, d);
    clinic.position.y = H / 2;
    clinic.castShadow = true;
    clinic.receiveShadow = true;
    group.add(clinic);

    // Illuminated 3D Red Medical Cross on facade
    const crossV = new THREE.Mesh(GEO.unitBox, MAT.medicalRed);
    crossV.scale.set(0.65, 2.2, 0.3);
    crossV.position.set(0, 6.4, d / 2 + 0.16);
    group.add(crossV);

    const crossH = new THREE.Mesh(GEO.unitBox, MAT.medicalRed);
    crossH.scale.set(2.2, 0.65, 0.3);
    crossH.position.set(0, 6.4, d / 2 + 0.16);
    group.add(crossH);

    populateRooftop(group, detailGroup, wx, wz, w, H, d, batcher, {
      hasWaterTank: true,
      hasPenthouse: false,
      hasBillboard: true,
      signText: name
    });
    return group;
  }

  // Default: "safehouse" (Hotel Niribili)
  return createDhakaApartmentBuilding(
    { x, y, w, h: d, height: 11.5, color: 0x3b4d63, hasWaterTank: true },
    batcher
  );
}

/**
 * Master dispatcher: builds any landmark, functional building, or urban block
 * while feeding repetitive details into the GPU InstancedMesh batcher.
 */
export function buildDetailedBuildingAsset(item, batcher = null) {
  if (item.role) return createFunctionalBuildingAsset(item, batcher);
  if (item.style === "station") return createRailwayStationAsset(item);
  if (item.style === "hangar") return createAirportHangarAsset(item, batcher);
  if (item.style === "factory") return createTejgaonFactoryBuilding(item, batcher);
  if (item.style === "market") return createWholesaleMarketAsset(item, batcher);
  if (item.style === "office" || item.style === "commercial" || item.style === "civic") {
    return createLandmarkHighRiseAsset(item, batcher);
  }

  if (item.height <= 10.5) {
    return createTejgaonFactoryBuilding(item, batcher);
  }
  return createDhakaApartmentBuilding(item, batcher);
}
