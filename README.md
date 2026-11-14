# DHAKA '96 — Tejgaon Sector (Three.js 3D Engine)

Modular 3D GTA-inspired sandbox built with **Three.js** on real-world Google Maps topology from **Tejgaon, Dhaka** (`1:1` real-life metric scale), configured to boot directly into **3D Spectator Mode**.

## Architecture
- `index.html` — Three.js import map (`r170`), Spectator & Playable HUD telemetry (active Tejgaon sub-zone, live GPS coordinates, altitude/speedometer, Cinematic Tour toggle, Bangladesh Railway train tracker, AI traffic follow toggle, landmark quick-jump pills, and top-right 2D radar minimap).
- `css/style.css` — VS Code-inspired dark HUD styling, cinematic shot banner, responsive viewport, and mobile touch controls.
- `js/tejgaonMapData.js` — Real-world Google Maps-derived road network, dual-gauge railway track, Hatirjheel & Crescent Lake waterbodies, and Tejgaon landmarks (`23.7510°N–23.7730°N`, `90.3860°E–90.4110°E`).
- `js/train.js` — Articulated **Bangladesh Railway Express** simulation along the Tejgaon railway polyline with scheduled station stops at Tejgaon Railway Station and bidirectional turnaround.
- `js/city3dRenderer.js` — Full Three.js 3D world builder & renderer with GPU `InstancedMesh` batching, distance LOD culling, 1990s BR Class 2700 Diesel-Electric Locomotive + 5 Passenger Coaches with exhaust smoke, 3D Spectator free-cam & cinematic director pipelines, and 90s Dhaka traffic (**Mishuk Baby Taxi**, **Dhaka Cycle Rickshaw**, **'92 Toyota Corolla DX**, **BRTC Double-Decker Bus**, and **DMP Patrol Jeep**).
- `assets/buildings/` — Procedural Dhaka architectural facades, emissive night/dusk window maps, rooftop water tanks, helipads, and interactive functional buildings (Safehouse, Auto Workshop, Clinic).
- `js/physics.js` — Spatial-hash AABB collision engine, Hatirjheel shoreline blocking, and vehicle-to-vehicle impulse physics.
- `js/player.js` — On-foot player controller and vehicle hijack/exit state (accessible anytime via `[V]`).
- `js/vehicles.js` — Autonomous road-following traffic AI and drivable vehicle handling physics.
- `js/main.js` — Main 3D simulation loop, 7-shot Automated Cinematic Camera Director, Free-Cam Drone Spectator controller, Train/AI vehicle spectator cycler, landmark quick-jump, and Playable Mode toggle.

## Controls (Spectator Mode — Active by Default)
- **Automated Cinematic Flythrough:** `G` (press `N` to skip to next shot; any `WASD` or mouse drag seamlessly hands control back to Free Drone)
- **Follow Bangladesh Railway Express / Live AI Traffic:** `Tab` (or click **FOLLOW TRAIN** / **FOLLOW AI [Tab]**)
- **Fly Horizontal:** `W A S D` or `Arrow Keys` (or left touch joystick on mobile)
- **Ascend / Descend Altitude:** `E` / `Q` (or `PageUp` / `PageDown`)
- **Fast Drone Boost:** `Shift`
- **Free Look 360°:** `Click + Drag` &bull; **Zoom / Dolly:** `Mouse Wheel` or `+` / `-` &bull; **Reset:** `Space`
- **Quick-Jump to Tejgaon Landmarks:** `1` – `6` (or click HUD landmark pills)
- **Toggle Playable Mode / Spectator Mode:** `V`
