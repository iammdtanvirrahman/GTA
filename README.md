# DHAKA '96 — Tejgaon Sector Prototype

Modular 2D GTA-inspired sandbox built on real-world road geometry and landmarks from **Tejgaon, Dhaka**.

## Architecture (Step 1: Tejgaon Map Module)
- `index.html` — Minimal shell, HUD overlay, minimap radar, and VS Code-styled debug telemetry bar.
- `css/style.css` — Dark-mode layout, responsive canvas sizing, and retro HUD styling.
- `js/tejgaonMapData.js` — Real-world Google Maps-derived road network, railway track, waterbody, and landmark footprints for Tejgaon (`23.755°N–23.773°N`, `90.388°E–90.408°E`).
- `js/cityRenderer.js` — Top-down 2D Canvas renderer with road markings, railway sleepers, industrial sheds, trees, streetlamps, and minimap radar.
- `js/main.js` — Camera pan/zoom/follow controller, WASD/Arrow scout movement, and mobile touch joystick support.

## Controls
- **Move Scout:** `W A S D` or `Arrow Keys` (or drag on mobile/touch)
- **Zoom Camera:** `Mouse Wheel` or `+` / `-`
- **Free Pan:** `Right-Click Drag` or `Middle-Click Drag`
- **Recenter on Scout:** `Space`
