# DHAKA '96 — Tejgaon Sector (Three.js 3D Engine)

Modular 3D GTA-inspired sandbox built with **Three.js** on real-world Google Maps topology from **Tejgaon, Dhaka**.

## Architecture
- `index.html` — Three.js import map (`r170`), HUD telemetry (HP, stamina, speedometer, active Tejgaon sub-zone, live GPS coordinates), camera mode toggle (`C`), and top-right 2D radar minimap.
- `css/style.css` — VS Code-inspired dark HUD styling, responsive viewport, and mobile touch controls.
- `js/tejgaonMapData.js` — Real-world Google Maps-derived road network, dual-gauge railway track, Hatirjheel & Crescent Lake waterbodies, and Tejgaon landmarks (`23.7510°N–23.7730°N`, `90.3860°E–90.4110°E`).
- `js/city3dRenderer.js` — Full Three.js 3D world builder & renderer: extruded 3D Tejgaon buildings with rooftop water tanks and billboards, 3D Hatirjheel arch bridge & animated water, dual-rail sleepers, streetlamps, trees, articulated 3D player character, and detailed 3D 90s Dhaka vehicles (**Mishuk Baby Taxi**, **Dhaka Cycle Rickshaw**, **'92 Toyota Corolla DX**, **BRTC Double-Decker Bus**, and **DMP Patrol Jeep** with flashing sirens).
- `js/physics.js` — Building AABB collision resolution, Hatirjheel shoreline blocking, and vehicle-to-vehicle / pedestrian impulse physics.
- `js/player.js` — On-foot player controller with walk/sprint stamina and vehicle hijack/exit state.
- `js/vehicles.js` — Autonomous road-following traffic AI and drivable vehicle handling physics.
- `js/main.js` — Main 3D simulation loop, chase/top-down/free-orbit camera controller, and 2D minimap radar sync.

## Controls
- **Move / Drive:** `W A S D` or `Arrow Keys` (or left touch joystick on mobile)
- **Sprint / Handbrake:** `Shift`
- **Hijack / Exit Vehicle:** `F` or `Enter`
- **Switch 3D Camera (Chase / Classic GTA Top-Down / Street):** `C`
- **Orbit / Zoom Camera:** `Right-Click Drag` &bull; `Mouse Wheel` or `+` / `-` &bull; `Space` Recenter
