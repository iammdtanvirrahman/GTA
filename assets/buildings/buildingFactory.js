/**
 * Detailed 1:1 Metric 3D Building Asset Builders for DHAKA '96 (Tejgaon Sector)
 * Category 01: Buildings & Landmarks
 *
 * Archetypes included:
 *   1. Tejgaon Industrial Factory / Warehouse (sawtooth/gabled tin roof, roll-up loading bay, exhaust stacks)
 *   2. Dhaka Mid-Rise Residential / Commercial Building (recessed balconies, ground-floor shop shutters, rooftop stairhead & Gazi water tank)
 *   3. Landmark Civic / Corporate High-Rise (curtain-wall/concrete facade, helipad/rooftop tower, illuminated signboards)
 *   4. Tejgaon Railway Station & Covered Platform Shed (pitched canopy, steel columns, station signboard)
 *   5. BAF Old Airport Hangar (curved barrel-vault roof, sliding hangar doors)
 *   6. Kawran Bazar Wholesale Market Shed (open-bay pillars, corrugated tin canopy, goods crates)
 */
import * as THREE from "three";
import {
  getApartmentFacadeTexture,
  getIndustrialFacadeTexture,
  getRooftopTexture,
  getShopfrontTexture,
  getLandmarkSignTexture
} from "./buildingTextures.js";

const sharedMaterials = {
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 }),
  concreteTrim: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.35 }),
  steelSilver: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 }),
  waterTankBlue: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38, metalness: 0.15 }),
  goldAccent: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 }),
  crateWood: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.88 })
};

/**
 * Adds a rooftop stair penthouse (chhat-er ghor) + blue water tank + TV antenna
 */
function addRooftopDetails(group, w, h, d, options = {}) {
  const { hasWaterTank = true, hasPenthouse = true, hasBillboard = false, signText = "" } = options;

  // Parapet wall around roof edge (0.9m high)
  const parapetH = 0.9;
  const parapetT = 0.35;
  const walls = [
    [w + parapetT, parapetH, parapetT, 0, h + parapetH / 2, d / 2],
    [w + parapetT, parapetH, parapetT, 0, h + parapetH / 2, -d / 2],
    [parapetT, parapetH, d, w / 2, h + parapetH / 2, 0],
    [parapetT, parapetH, d, -w / 2, h + parapetH / 2, 0]
  ];
  for (const [pw, ph, pd, px, py, pz] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), sharedMaterials.concreteTrim);
    m.position.set(px, py, pz);
    m.castShadow = true;
    group.add(m);
  }

  // Rooftop stairhead room (Chhat-er ghor)
  if (hasPenthouse && w > 10 && d > 10) {
    const phW = Math.min(4.2, w * 0.26);
    const phD = Math.min(3.6, d * 0.24);
    const phH = 2.5;
    const stairHead = new THREE.Mesh(
      new THREE.BoxGeometry(phW, phH, phD),
      sharedMaterials.concreteDark
    );
    stairHead.position.set(-w * 0.22, h + phH / 2, -d * 0.2);
    stairHead.castShadow = true;
    group.add(stairHead);

    // Steel rooftop door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.0, 0.95), sharedMaterials.steelDark);
    door.position.set(-w * 0.22 + phW / 2 + 0.05, h + 1.0, -d * 0.2);
    group.add(door);
  }

  // Classic Dhaka 1,500L blue rooftop water tank on concrete stand
  if (hasWaterTank) {
    const tx = w * 0.22;
    const tz = d * 0.18;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4), sharedMaterials.concreteTrim);
    stand.position.set(tx, h + 0.35, tz);
    group.add(stand);

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 1.55, 12),
      sharedMaterials.waterTankBlue
    );
    tank.position.set(tx, h + 1.48, tz);
    tank.castShadow = true;
    group.add(tank);
  }

  // 1990s VHF/UHF Rooftop Yagi TV Antenna
  if (h > 10 && w > 12) {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 3.6, 6),
      sharedMaterials.steelSilver
    );
    mast.position.set(w * 0.28, h + 1.8, -d * 0.26);
    group.add(mast);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.05), sharedMaterials.steelSilver);
    crossbar.position.set(w * 0.28, h + 3.2, -d * 0.26);
    group.add(crossbar);
  }

  // Optional GTA Landmark Billboard
  if (hasBillboard && signText) {
    const signW = Math.min(w * 0.88, 28);
    const signH = signW * 0.24;
    const tex = getLandmarkSignTexture(signText);

    // Steel support trusses
    for (const xOff of [-signW * 0.32, signW * 0.32]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, signH + 1.4, 0.28),
        sharedMaterials.steelDark
      );
      post.position.set(xOff, h + (signH + 1.4) / 2, 0);
      group.add(post);
    }

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(signW, signH, 0.35),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    board.position.set(0, h + signH * 0.5 + 1.1, 0);
    group.add(board);
  }
}

/**
 * 1. Detailed Dhaka Mid-Rise Residential / Commercial Building
 *    - Ground floor commercial shop shutters + signboard
 *    - Upper floors with concrete slab bands & grilled windows
 *    - Projecting front/rear balconies with steel railings
 */
export function createDhakaApartmentBuilding(spec) {
  const { x, y, w, h: d, height: H, color = 0x4b5563, hasWaterTank = true } = spec;
  const group = new THREE.Group();
  group.position.set(x + w / 2, 0, y + d / 2);

  const stories = Math.max(2, Math.round(H / 3.2));
  const hexColor = `#${new THREE.Color(color).getHexString()}`;
  const wallTex = getApartmentFacadeTexture(hexColor, stories);
  const roofTex = getRooftopTexture(false);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.82 });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.88 });

  // Main extruded building block (side walls use textured windows, top uses concrete roof)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, H, d),
    [wallMat, wallMat, roofMat, sharedMaterials.concreteDark, wallMat, wallMat]
  );
  body.position.y = H / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Ground-floor Dhaka shopfront shutters on front & back faces
  const shopNames = ["BISMILLAH STORE", "TEJGAON HARDWARE", "JANATA PHARMACY", "DHAKA MOTORS", "AL-MADINA HOTEL"];
  const shopName = shopNames[Math.abs(Math.round(x + y)) % shopNames.length];
  const shopTex = getShopfrontTexture(shopName);
  const shopMat = new THREE.MeshStandardMaterial({ map: shopTex, roughness: 0.7 });

  const shopBandFront = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 3.1, 0.25), shopMat);
  shopBandFront.position.set(0, 1.55, d / 2 + 0.08);
  group.add(shopBandFront);

  // Projecting balconies on upper stories (if building is at least 3 stories)
  if (stories >= 3 && w >= 12) {
    const balcW = Math.min(4.5, w * 0.34);
    for (let s = 1; s < stories; s++) {
      const by = s * (H / stories);
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(balcW, 0.22, 1.15),
        sharedMaterials.concreteTrim
      );
      slab.position.set(0, by, d / 2 + 0.55);
      slab.castShadow = true;
      group.add(slab);

      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(balcW, 0.95, 0.08),
        sharedMaterials.steelDark
      );
      rail.position.set(0, by + 0.52, d / 2 + 1.08);
      group.add(rail);
    }
  }

  addRooftopDetails(group, w, H, d, { hasWaterTank, hasPenthouse: true });
  return group;
}

/**
 * 2. Detailed Tejgaon Industrial Factory / Warehouse
 *    - Red brick lower wall + corrugated steel upper cladding + roll-up bay door
 *    - Pitched corrugated steel roof + industrial chimney exhaust stacks
 */
export function createTejgaonFactoryBuilding(spec) {
  const { x, y, w, h: d, height: H = 9.5, name = "" } = spec;
  const group = new THREE.Group();
  group.position.set(x + w / 2, 0, y + d / 2);

  const wallTex = getIndustrialFacadeTexture();
  const roofTex = getRooftopTexture(true);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    roughness: 0.55,
    metalness: 0.35
  });

  const baseH = H * 0.78;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, baseH, d),
    [wallMat, wallMat, roofMat, sharedMaterials.concreteDark, wallMat, wallMat]
  );
  body.position.y = baseH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Pitched industrial shed roof ridge
  const ridgeH = H * 0.24;
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, ridgeH, d * 0.62), roofMat);
  roofCap.position.y = baseH + ridgeH / 2;
  roofCap.castShadow = true;
  group.add(roofCap);

  // Twin steel exhaust chimneys
  for (const xOff of [-w * 0.28, w * 0.28]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 3.8, 10),
      sharedMaterials.steelDark
    );
    pipe.position.set(xOff, baseH + ridgeH + 1.6, -d * 0.18);
    pipe.castShadow = true;
    group.add(pipe);
  }

  // Loading dock concrete platform & wooden cargo crates outside
  const dock = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(8, w * 0.45), 0.85, 2.2),
    sharedMaterials.concreteTrim
  );
  dock.position.set(0, 0.425, d / 2 + 1.0);
  dock.receiveShadow = true;
  group.add(dock);

  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), sharedMaterials.crateWood);
  crate.position.set(-1.4, 1.4, d / 2 + 1.1);
  crate.castShadow = true;
  group.add(crate);

  if (name) {
    addRooftopDetails(group, w, baseH + ridgeH, d, {
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

  // Raised brick passenger platform (0.9m high)
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.9, d),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.88 })
  );
  platform.position.y = 0.45;
  platform.receiveShadow = true;
  group.add(platform);

  // Station ticket office building
  const ticketOffice = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.58, 4.8, d * 0.45),
    new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 })
  );
  ticketOffice.position.set(2.5, 0.9 + 2.4, 0);
  ticketOffice.castShadow = true;
  group.add(ticketOffice);

  // Platform canopy roof supported by steel columns
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.95, 0.45, d * 0.86),
    sharedMaterials.steelSilver
  );
  canopy.position.set(0, 6.2, 0);
  canopy.castShadow = true;
  group.add(canopy);

  for (let z = -d * 0.38; z <= d * 0.38; z += 14) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 5.4, 8),
      sharedMaterials.steelDark
    );
    col.position.set(-w * 0.32, 3.6, z);
    group.add(col);
  }

  // Yellow & black Bangladesh Railway station sign
  const signTex = getLandmarkSignTexture(name, "#facc15", "#0f172a", "#0f172a");
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 2.4, 14),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  sign.position.set(-w * 0.42, 7.6, 0);
  group.add(sign);

  return group;
}

/**
 * 4. BAF Old Airport Curved Hangar
 */
export function createAirportHangarAsset(lm) {
  const { x, y, w, h: d, name } = lm;
  const group = new THREE.Group();
  group.position.set(x + w / 2, 0, y + d / 2);

  const wallH = 8.5;
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(w, wallH, d),
    sharedMaterials.concreteDark
  );
  walls.position.y = wallH / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Barrel-vault curved hangar roof
  const archGeo = new THREE.CylinderGeometry(
    w / 2,
    w / 2,
    d,
    20,
    1,
    false,
    0,
    Math.PI
  );
  archGeo.rotateZ(Math.PI / 2);
  archGeo.rotateY(Math.PI / 2);
  const archRoof = new THREE.Mesh(archGeo, sharedMaterials.steelSilver);
  archRoof.scale.set(1, 0.36, 1);
  archRoof.position.y = wallH;
  archRoof.castShadow = true;
  group.add(archRoof);

  // Sliding hangar doors on south face
  const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, wallH - 0.8, 0.4), sharedMaterials.steelDark);
  door.position.set(0, (wallH - 0.8) / 2, d / 2 + 0.15);
  group.add(door);

  addRooftopDetails(group, w, wallH + w * 0.18, d, {
    hasWaterTank: false,
    hasPenthouse: false,
    hasBillboard: true,
    signText: name
  });

  return group;
}

/**
 * 5. Landmark Corporate / Civic High-Rise (WASA Bhaban, Media Bhaban, Farmgate Plaza, Khamarbari)
 */
export function createLandmarkHighRiseAsset(lm) {
  const { x, y, w, h: d, style, name } = lm;
  const heights = {
    office: 44, // ~13 stories
    commercial: 28, // ~8 stories
    civic: 20 // ~6 stories
  };
  const colors = {
    office: "#1e3a5f",
    commercial: "#4c1d95",
    civic: "#14532d"
  };

  const H = heights[style] || 24;
  const group = new THREE.Group();
  group.position.set(x + w / 2, 0, y + d / 2);

  const stories = Math.round(H / 3.4);
  const wallTex = getApartmentFacadeTexture(colors[style] || "#334155", stories);
  const roofTex = getRooftopTexture(false);

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    roughness: style === "office" ? 0.35 : 0.72,
    metalness: style === "office" ? 0.35 : 0.1
  });
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85 });

  // Ground podium + main tower shaft
  const podiumH = 6.5;
  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(w, podiumH, d),
    [wallMat, wallMat, roofMat, sharedMaterials.concreteDark, wallMat, wallMat]
  );
  podium.position.y = podiumH / 2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  const towerH = H - podiumH;
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.86, towerH, d * 0.86),
    [wallMat, wallMat, roofMat, sharedMaterials.concreteDark, wallMat, wallMat]
  );
  tower.position.y = podiumH + towerH / 2;
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // Telecom microwave spire on corporate towers
  if (style === "office") {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.55, 11, 8),
      sharedMaterials.steelSilver
    );
    spire.position.set(0, H + 5.5, 0);
    group.add(spire);
  }

  addRooftopDetails(group, w * 0.86, H, d * 0.86, {
    hasWaterTank: true,
    hasPenthouse: true,
    hasBillboard: true,
    signText: name
  });

  return group;
}

/**
 * 6. Kawran Bazar Wholesale Market Complex
 */
export function createWholesaleMarketAsset(lm) {
  const { x, y, w, h: d, name } = lm;
  const group = new THREE.Group();
  group.position.set(x + w / 2, 0, y + d / 2);

  const hallH = 7.2;
  const wallTex = getShopfrontTexture("KAWRAN BAZAR WHOLESALE", "#f59e0b");
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({
    map: getRooftopTexture(true),
    roughness: 0.65
  });

  const hall = new THREE.Mesh(
    new THREE.BoxGeometry(w, hallH, d),
    [wallMat, wallMat, roofMat, sharedMaterials.concreteDark, wallMat, wallMat]
  );
  hall.position.y = hallH / 2;
  hall.castShadow = true;
  hall.receiveShadow = true;
  group.add(hall);

  // Vegetable/rice sack & crate stacks lining the bazaar perimeter
  for (let i = -3; i <= 3; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), sharedMaterials.crateWood);
    crate.position.set(i * 6, 0.55, d / 2 + 1.1);
    crate.castShadow = true;
    group.add(crate);
  }

  addRooftopDetails(group, w, hallH, d, {
    hasWaterTank: false,
    hasPenthouse: false,
    hasBillboard: true,
    signText: name
  });

  return group;
}

/**
 * Master dispatcher: builds the exact detailed 3D building asset for any landmark or city block.
 */
export function buildDetailedBuildingAsset(item) {
  if (item.style === "station") return createRailwayStationAsset(item);
  if (item.style === "hangar") return createAirportHangarAsset(item);
  if (item.style === "factory") return createTejgaonFactoryBuilding(item);
  if (item.style === "market") return createWholesaleMarketAsset(item);
  if (item.style === "office" || item.style === "commercial" || item.style === "civic") {
    return createLandmarkHighRiseAsset(item);
  }

  // Generated urban blocks: low-rise industrial shed vs mid-rise Dhaka building
  if (item.height <= 10.5) {
    return createTejgaonFactoryBuilding(item);
  }
  return createDhakaApartmentBuilding(item);
}
