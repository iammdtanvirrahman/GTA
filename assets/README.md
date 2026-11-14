# GTA '96 — Asset Library

Central asset library. Keep each asset category in its own folder and document new assets before integrating them.

## Folder map

- buildings/ — building models, procedural generators, façades and architectural details.
- cars/ — cars, taxis, buses, rickshaws and other road vehicles.
- humans/ — player characters, pedestrians, NPCs, animations and materials.
- trees/ — trees, palms, shrubs, grass and vegetation.
- environment/ — roads, sidewalks, terrain, water, bridges and landscape pieces.
- props/ — street furniture, signs, lamps, barriers and reusable world objects.
- textures/ — shared textures, decals and material maps.
- audio/ — asset-related sound effects and ambience.

## Asset rules

- Use lowercase, descriptive file and folder names.
- Prefer GLB/GLTF for 3D models; include source files when practical.
- Keep model-specific textures beside the model; put reusable textures in textures/.
- Include licenses and attribution for third-party assets.
- Optimize models and textures for real-time mobile rendering.
- Do not commit generated builds, caches, temporary exports or duplicates.
- Update the relevant category README when assets change.

A folder is an asset source, not automatically a runtime loader. Update the relevant game loader/import path when integrating files, and verify referenced paths before release.
