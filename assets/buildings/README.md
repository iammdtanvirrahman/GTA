# Buildings

Contains procedural building systems and building-related 3D assets for the Dhaka '96 world.

## Current files

- buildingFactory.js — procedural building creation.
- buildingTextures.js — building surface and façade textures.
- functionalBuildings.js — buildings with gameplay or interaction behavior.

## Add here

- GLB/GLTF building models and source files.
- Residential, commercial, industrial and landmark variants.
- Roofs, balconies, doors, windows and façade modules.
- Building-specific materials and collision metadata.

Keep generation logic separate from reusable model assets. Document dimensions, scale, origin, collision behavior and texture dependencies. Preserve existing procedural modules unless a tested migration replaces them.

## Real-world Dhaka landmark models

`realWorldDhakaLandmarks.js` contains procedural, game-scale architectural interpretations of:

- `parliament` — Jatiya Sangsad Bhaban: layered concrete geometry and central chamber.
- `ahsanManzil` — Ahsan Manzil: pink palace massing, dome and corner towers.
- `curzonHall` — Curzon Hall: red-brick academic block, repeated arched bays and cupolas.
- `lalbaghFort` — Lalbagh Fort: fortified compound, gatehouse, domed pavilions and courtyard pool.

### Usage

Pass a `landmark` key through `buildDetailedBuildingAsset`, for example:

```js
const model = buildDetailedBuildingAsset({
  landmark: "ahsanManzil",
  x: 120,
  z: -80,
  scale: 1
});
scene.add(model);
```

These are recognizable procedural interpretations for gameplay, not photogrammetric or survey-accurate replicas. Check scale, placement, collision and mobile performance in the target scene.
