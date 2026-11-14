# DHAKA '96 — Tejgaon Sector Prototype

Modular 2D GTA-inspired sandbox built on real-world road geometry and landmarks from **Tejgaon, Dhaka**.

## Architecture
- `index.html` — Game shell, HUD overlay (health/sprint/speedometer/vehicle info), minimap radar, and mobile touch controls (`sprint` + `enter/exit` buttons).
- `css/style.css` — VS Code dark-mode layout, responsive canvas sizing, and retro HUD styling.
- `js/tejgaonMapData.js` — Real-world Google Maps-derived road network, railway track, waterbody, and landmark footprints for Tejgaon (`23.7510°N–23.7730°N`, `90.3860°E–90.4110°E`).
- `js/physics.js` — Circle-vs-AABB building resolution, point-in-polygon water shore collision, and oriented bounding-box (OBB) vehicle collision physics.
- `js/player.js` — On-foot player controller with walk/sprint stamina, animated stride/arms, and vehicle enter/exit state.
- `js/vehicles.js` — Authentic 1990s Dhaka traffic AI & drivable vehicle physics (**Mishuk Baby Taxi**, **Dhaka Cycle Rickshaw**, **'92 Toyota Corolla DX**, **BRTC Double-Decker Bus**, and **DMP Police Jeep**).
- `js/cityRenderer.js` — Top-down 2D Canvas renderer for the city, landmarks, animated player, detailed 90s vehicles, and live minimap radar.
- `js/main.js` — Main game loop, camera lead/zoom controller, input manager, and HUD telemetry updater.

## Controls
- **Move / Steer:** `W A S D` or `Arrow Keys` (or left touch joystick on mobile)
- **Sprint / Handbrake:** `Shift`
- **Enter / Hijack / Exit Vehicle:** `F` or `Enter` (or `ENTER / EXIT` button on mobile)
- **Zoom Camera:** `Mouse Wheel` or `+` / `-`
- **Free Pan:** `Right-Click Drag` &bull; **Recenter:** `Space`
