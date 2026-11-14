/**
 * Procedural real-world Dhaka landmark-inspired building models.
 * Dimensions are game-scale approximations, not survey-accurate replicas.
 * Each builder returns a THREE.Group and uses reusable materials/geometries.
 */
import * as THREE from "three";

const mat = (color, roughness = 0.82) =>
  new THREE.MeshStandardMaterial({ color, roughness });
const M = {
  cream: mat(0xd8c8a8), pale: mat(0xe8dfc9), red: mat(0x9f3e32),
  brick: mat(0x9b5540), stone: mat(0xb7ad99), roof: mat(0x514b43),
  green: mat(0x647b55), dark: mat(0x343a40), water: mat(0x4c91a5, 0.35),
  glass: new THREE.MeshStandardMaterial({ color: 0x8eb8c7, metalness: 0.25, roughness: 0.25 })
};
const box = (g, material, x, y, z, sx, sy, sz) => {
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
};
const cube = new THREE.BoxGeometry(1, 1, 1);
const cylinder = (r1, r2, h, n = 16) => new THREE.CylinderGeometry(r1, r2, h, n);
const groupAt = (x = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); return g; };

/** National Parliament complex: layered geometric concrete masses and central chamber. */
export function createJatiyaSangsadBhaban(spec = {}) {
  const g = groupAt(spec.x || 0, spec.z || 0);
  const s = spec.scale || 1;
  const base = new THREE.Mesh(cube, M.stone); base.scale.set(118*s, 3*s, 92*s); base.position.y = 1.5*s; g.add(base);
  // Broad outer wings and stepped terraces.
  for (let i = 0; i < 4; i++) {
    const w = (88 - i * 13) * s, d = (66 - i * 10) * s, h = (5 + i * 1.5) * s;
    const wing = new THREE.Mesh(cube, i % 2 ? M.cream : M.pale);
    wing.scale.set(w, h, d); wing.position.set(0, 3*s + i*5*s + h/2, 0); wing.castShadow = true; wing.receiveShadow = true; g.add(wing);
  }
  // Central monumental cylindrical chamber.
  const chamber = new THREE.Mesh(cylinder(17*s, 20*s, 34*s, 12), M.cream);
  chamber.position.set(0, 21*s, 0); chamber.castShadow = true; g.add(chamber);
  const crown = new THREE.Mesh(cylinder(13*s, 17*s, 4*s, 12), M.stone);
  crown.position.set(0, 40*s, 0); g.add(crown);
  // Deep-set circular openings on the central volume.
  for (let i=0;i<12;i++) {
    const a=i*Math.PI/6, r=19*s;
    const win=new THREE.Mesh(cube,M.dark); win.scale.set(0.45*s,8*s,0.18*s);
    win.position.set(Math.sin(a)*r,22*s,Math.cos(a)*r); win.rotation.y=a; g.add(win);
  }
  g.userData.landmark = "Jatiya Sangsad Bhaban (inspired)";
  return g;
}

/** Ahsan Manzil-inspired pink palace with central dome, corner towers and arched bays. */
export function createAhsanManzil(spec = {}) {
  const g = groupAt(spec.x || 0, spec.z || 0), s = spec.scale || 1;
  box(g,cube,0,7*s,0,42*s,14*s,18*s);
  box(g,cube,0,14.5*s,0,44*s,1*s,20*s);
  // Repeated façade pilasters and dark recessed windows.
  for (let x=-18; x<=18; x+=6) {
    box(g,cube,x,7*s,9.15*s,0.55*s,12*s,0.35*s);
    box(g,cube,x,8*s,9.36*s,2.0*s,4.2*s,0.12*s);
    box(g,cube,x,8*s,-9.36*s,2.0*s,4.2*s,0.12*s);
  }
  for (const x of [-20,20]) {
    const tower=new THREE.Mesh(cylinder(2.4*s,3*s,20*s,12),M.red); tower.position.set(x*s,10*s,0); g.add(tower);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(3*s,16,10,0,Math.PI*2,0,Math.PI/2),M.red);
    dome.position.set(x*s,20*s,0); g.add(dome);
  }
  const dome=new THREE.Mesh(new THREE.SphereGeometry(6*s,20,12,0,Math.PI*2,0,Math.PI/2),M.red);
  dome.position.set(0,15*s,0); g.add(dome);
  box(g,cube,0,15.4*s,0,10*s,0.6*s,10*s);
  g.userData.landmark = "Ahsan Manzil (inspired)";
  return g;
}

/** Curzon Hall-inspired red-brick academic block with Mughal arches and corner cupolas. */
export function createCurzonHall(spec = {}) {
  const g=groupAt(spec.x||0,spec.z||0), s=spec.scale||1;
  box(g,cube,0,5*s,0,58*s,10*s,22*s);
  box(g,cube,0,10.4*s,0,60*s,0.8*s,24*s);
  for(let x=-25;x<=25;x+=5) {
    box(g,cube,x,4.7*s,11.2*s,0.65*s,9.4*s,0.8*s);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(1.55*s,0.22*s,8,16,Math.PI),M.pale);
    arch.position.set(x,7.0*s,11.7*s); arch.rotation.z=Math.PI; g.add(arch);
    box(g,cube,x,3.5*s,11.55*s,2.5*s,5.2*s,0.2*s);
  }
  for(const x of [-25,25]) for(const z of [-8,8]) {
    const tower=new THREE.Mesh(cylinder(1.4*s,2*s,15*s,12),M.brick); tower.position.set(x*s,7.5*s,z*s); g.add(tower);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(2.2*s,3*s,12),M.red); cap.position.set(x*s,16.5*s,z*s); g.add(cap);
  }
  g.userData.landmark="Curzon Hall (inspired)";
  return g;
}

/** Lalbagh Fort-inspired fortified Mughal compound with gate, walls and domed mausoleum. */
export function createLalbaghFort(spec = {}) {
  const g=groupAt(spec.x||0,spec.z||0), s=spec.scale||1;
  // Perimeter walls with a central entrance gap on the front.
  box(g,cube,0,3*s,-24*s,64*s,6*s,2*s);
  box(g,cube,-31*s,3*s,0,2*s,6*s,50*s);
  box(g,cube,31*s,3*s,0,2*s,6*s,50*s);
  box(g,cube,-20*s,3*s,24*s,24*s,6*s,2*s);
  box(g,cube,20*s,3*s,24*s,24*s,6*s,2*s);
  // Main gatehouse and crenellations.
  box(g,cube,0,5*s,24*s,13*s,10*s,5*s);
  for(let x=-29;x<=29;x+=4) box(g,cube,x,6.5*s,-24*s,1.2*s,1*s,2.5*s);
  // Three domed pavilion volumes.
  for(const [x,z] of [[0,-8],[-20,4],[20,4]]) {
    box(g,cube,x,4*s,z,12*s,8*s,10*s);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(4.8*s,16,10,0,Math.PI*2,0,Math.PI/2),M.pale);
    dome.position.set(x,8*s,z); g.add(dome);
    const finial=new THREE.Mesh(cylinder(0.12*s,0.3*s,2*s,8),M.dark); finial.position.set(x,13*s,z); g.add(finial);
  }
  // Reflecting pool in the courtyard.
  const pool=new THREE.Mesh(new THREE.BoxGeometry(10*s,0.18*s,30*s),M.water); pool.position.set(0,0.12*s,5*s); g.add(pool);
  g.userData.landmark="Lalbagh Fort (inspired)";
  return g;
}

/** Select a landmark builder by stable style key. */
export function createRealWorldDhakaLandmark(style, spec = {}) {
  const builders = {
    parliament: createJatiyaSangsadBhaban,
    ahsanManzil: createAhsanManzil,
    curzonHall: createCurzonHall,
    lalbaghFort: createLalbaghFort
  };
  const build = builders[style];
  return build ? build(spec) : null;
}
