# DHAKA '96 — Tejgaon Sector (Three.js 3D Engine)

Modular 3D GTA-inspired sandbox built with **Three.js** on real-world Google Maps topology from **Tejgaon, Dhaka** (`1:1` real-life metric scale), currently configured to boot directly into **3D Spectator Mode**.

## Architecture
- `index.html` — Three.js import map (`r170`), Spectator & Playable HUD telemetry (active Tejgaon sub-zone, live GPS coordinates, altitude/speedometer, AI traffic follow toggle, landmark quick-jump pills, and top-right 2D radar minimap).
- `css/style.css` — VS Code-inspired dark HUD styling, responsive viewport, and mobile touch controls.
- `js/tejgaonMapData.js` — Real-world Google Maps-derived road network, dual-gauge railway track, Hatirjheel & Crescent Lake waterbodies, and Tejgaon landmarks (`23.7510°N–23.7730°N`, `90.3860°E–90.4110°E`).
- `js/city3dRenderer.js` — Full Three.js 3D world builder & renderer with GPU `InstancedMesh` batching, distance LOD culling, 3D Spectator free-cam & AI-follow camera pipelines, and 90s Dhaka traffic (**Mishuk Baby Taxi**, **Dhaka Cycle Rickshaw**, **'92 Toyota Corolla DX**, **BRTC Double-Decker Bus**, and **DMP Patrol Jeep**).
- `assets/buildings/` — Procedural Dhaka architectural facades, emissive night/dusk window maps, rooftop water tanks, helipads, and interactive functional buildings (Safehouse, Auto Workshop, Clinic).
- `js/physics.js` — Spatial-hash AABB collision engine, Hatirjheel shoreline blocking, and vehicle-to-vehicle impulse physics.
- `js/player.js` — On-foot player controller and vehicle hijack/exit state (accessible anytime via `[V]`).
- `js/vehicles.js` — Autonomous road-following traffic AI and drivable vehicle handling physics.
- `js/main.js` — Main 3D simulation loop, Free-Cam Drone Spectator controller, AI vehicle spectator cycler, landmark quick-jump, and Playable Mode toggle.

## Controls (Spectator Mode — Active by Default)
- **Fly Horizontal:** `W A S D` or `Arrow Keys` (or left touch joystick on mobile)
- **Ascend / Descend Altitude:** `E` / `Q` (or `PageUp` / `PageDown`)
- **Fast Drone Boost:** `Shift`
- **Free Look 360°:** `Click + Drag` &bull; **Zoom / Dolly:** `Mouse Wheel` or `+` / `-` &bull; **Reset:** `Space`
- **Spectate Live AI Traffic:** `Tab` (cycles through Mishuks, Rickshaws, Corollas, BRTC Buses & DMP Jeeps)
- **Quick-Jump to Tejgaon Landmarks:** `1` – `6` (or click HUD landmark pills)
- **Toggle Playable Mode / Spectator Mode:** `V`
