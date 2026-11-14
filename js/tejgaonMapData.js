/**
 * Real-world Google Maps-derived spatial layout of Tejgaon, Dhaka.
 * Bounding box:
 *   Lat: 23.7510° N (South: Kawran Bazar) -> 23.7730° N (North: Mohakhali/Old Airport North)
 *   Lng: 90.3860° E (West: Bijoy Sarani / Old Airport) -> 90.4110° E (East: Hatirjheel)
 *
 * World coordinates: 4200 x 3800 px (1 px ≈ 0.62 meters)
 */

export const MAP_CONFIG = {
  width: 4200,
  height: 3800,
  bounds: {
    minLat: 23.7510,
    maxLat: 23.7730,
    minLng: 90.3860,
    maxLng: 90.4110
  },
  spawn: { x: 2220, y: 2150 } // Heart of Tejgaon Industrial Area (Shaheed Tajuddin Ahmed Ave)
};

// Convert normalized [0..1] map coordinates to world pixels
const wx = (nx) => Math.round(nx * MAP_CONFIG.width);
const wy = (ny) => Math.round(ny * MAP_CONFIG.height);

/**
 * Waterbodies (Hatirjheel Lake & Crescent Lake edge)
 */
export const WATER_BODIES = [
  {
    name: "Hatirjheel Lake",
    points: [
      { x: wx(0.76), y: wy(0.32) },
      { x: wx(0.89), y: wy(0.30) },
      { x: wx(0.98), y: wy(0.38) },
      { x: wx(0.96), y: wy(0.56) },
      { x: wx(0.84), y: wy(0.64) },
      { x: wx(0.75), y: wy(0.74) },
      { x: wx(0.68), y: wy(0.72) },
      { x: wx(0.71), y: wy(0.56) },
      { x: wx(0.79), y: wy(0.45) }
    ]
  },
  {
    name: "Crescent Lake Edge",
    points: [
      { x: wx(0.02), y: wy(0.42) },
      { x: wx(0.08), y: wy(0.42) },
      { x: wx(0.08), y: wy(0.56) },
      { x: wx(0.02), y: wy(0.56) }
    ]
  }
];

/**
 * Zones & Green Grounds (Tejgaon Old Airport Runway, Parks, Industrial Blocks)
 */
export const ZONES = [
  {
    id: "old_airport",
    name: "Tejgaon Old Airport",
    type: "airfield",
    x: wx(0.11),
    y: wy(0.08),
    w: wx(0.32),
    h: wy(0.42)
  },
  {
    id: "industrial_north",
    name: "Tejgaon Industrial Area (North)",
    type: "industrial",
    x: wx(0.49),
    y: wy(0.12),
    w: wx(0.28),
    h: wy(0.34)
  },
  {
    id: "industrial_south",
    name: "Tejgaon Industrial Area (South)",
    type: "industrial",
    x: wx(0.49),
    y: wy(0.50),
    w: wx(0.24),
    h: wy(0.27)
  },
  {
    id: "farmgate",
    name: "Farmgate Commercial Hub",
    type: "commercial",
    x: wx(0.14),
    y: wy(0.60),
    w: wx(0.24),
    h: wy(0.19)
  },
  {
    id: "kawran_bazar",
    name: "Kawran Bazar Wholesale Zone",
    type: "commercial",
    x: wx(0.22),
    y: wy(0.81),
    w: wx(0.26),
    h: wy(0.16)
  },
  {
    id: "nakhalpara",
    name: "Nakhalpara Residential",
    type: "residential",
    x: wx(0.47),
    y: wy(0.02),
    w: wx(0.34),
    h: wy(0.09)
  }
];

/**
 * Major & Secondary Roads matching Google Maps Tejgaon Topology
 */
export const ROADS = [
  // 1. Kazi Nazrul Islam Ave / Airport Road (North-South Western Artery)
  {
    name: "Kazi Nazrul Islam Ave / Airport Rd",
    width: 78,
    lanes: 4,
    type: "arterial",
    points: [
      { x: wx(0.44), y: wy(0.00) },
      { x: wx(0.44), y: wy(0.28) },
      { x: wx(0.43), y: wy(0.54) },
      { x: wx(0.32), y: wy(0.69) },
      { x: wx(0.34), y: wy(0.86) },
      { x: wx(0.36), y: wy(1.00) }
    ]
  },
  // 2. Shaheed Tajuddin Ahmed Ave (Tejgaon Industrial Main Spine)
  {
    name: "Shaheed Tajuddin Ahmed Ave",
    width: 74,
    lanes: 4,
    type: "arterial",
    points: [
      { x: wx(0.64), y: wy(0.00) },
      { x: wx(0.62), y: wy(0.26) },
      { x: wx(0.60), y: wy(0.49) },
      { x: wx(0.58), y: wy(0.75) },
      { x: wx(0.56), y: wy(1.00) }
    ]
  },
  // 3. Bijoy Sarani Link Road (East-West Connector across Railway)
  {
    name: "Bijoy Sarani - Tejgaon Link Rd",
    width: 66,
    lanes: 4,
    type: "arterial",
    points: [
      { x: wx(0.05), y: wy(0.54) },
      { x: wx(0.28), y: wy(0.54) },
      { x: wx(0.43), y: wy(0.54) },
      { x: wx(0.60), y: wy(0.49) },
      { x: wx(0.79), y: wy(0.45) }
    ]
  },
  // 4. Love Road (Tejgaon Industrial East-West)
  {
    name: "Love Road",
    width: 48,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.44), y: wy(0.35) },
      { x: wx(0.61), y: wy(0.35) },
      { x: wx(0.77), y: wy(0.35) }
    ]
  },
  // 5. Nabisco - Mohakhali Cross Road
  {
    name: "Bir Uttam Mir Shawkat Sarak",
    width: 58,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.44), y: wy(0.18) },
      { x: wx(0.63), y: wy(0.18) },
      { x: wx(0.88), y: wy(0.21) }
    ]
  },
  // 6. Tejgaon Station Road / Kunipara Road
  {
    name: "Tejgaon Station Road",
    width: 44,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.43), y: wy(0.66) },
      { x: wx(0.59), y: wy(0.66) },
      { x: wx(0.71), y: wy(0.66) }
    ]
  },
  // 7. Panthapath / Kawran Bazar Link
  {
    name: "Kazi Nazrul - Panthapath Link",
    width: 60,
    lanes: 4,
    type: "arterial",
    points: [
      { x: wx(0.04), y: wy(0.85) },
      { x: wx(0.34), y: wy(0.86) },
      { x: wx(0.57), y: wy(0.86) },
      { x: wx(0.74), y: wy(0.82) }
    ]
  },
  // 8. Hatirjheel Ring Road (West-South Loop)
  {
    name: "Hatirjheel Ring Road",
    width: 46,
    lanes: 2,
    type: "scenic",
    points: [
      { x: wx(0.77), y: wy(0.28) },
      { x: wx(0.73), y: wy(0.48) },
      { x: wx(0.67), y: wy(0.68) },
      { x: wx(0.74), y: wy(0.82) },
      { x: wx(0.95), y: wy(0.74) }
    ]
  },
  // 9. Farmgate - Khamarbari Road
  {
    name: "Khamarbari Road",
    width: 50,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.08), y: wy(0.69) },
      { x: wx(0.32), y: wy(0.69) }
    ]
  },
  // 10. Internal Industrial Lanes
  {
    name: "Tejgaon I/A Lane 1",
    width: 34,
    lanes: 2,
    type: "local",
    points: [
      { x: wx(0.53), y: wy(0.18) },
      { x: wx(0.53), y: wy(0.49) },
      { x: wx(0.52), y: wy(0.78) }
    ]
  },
  {
    name: "Tejgaon I/A Lane 2",
    width: 34,
    lanes: 2,
    type: "local",
    points: [
      { x: wx(0.69), y: wy(0.18) },
      { x: wx(0.68), y: wy(0.49) }
    ]
  }
];

/**
 * Dhaka-Narayanganj / Tongi Dual-Gauge Railway Line running North-South through Tejgaon
 */
export const RAILWAY_LINE = {
  name: "Tejgaon Rail Line",
  points: [
    { x: wx(0.475), y: wy(0.00) },
    { x: wx(0.472), y: wy(0.28) },
    { x: wx(0.468), y: wy(0.54) },
    { x: wx(0.462), y: wy(0.76) },
    { x: wx(0.455), y: wy(1.00) }
  ]
};

/**
 * Authentic Tejgaon Landmarks & Buildings
 */
export const LANDMARKS = [
  {
    name: "Tejgaon Old Airport Runway",
    x: wx(0.22),
    y: wy(0.13),
    w: 110,
    h: 1180,
    style: "runway"
  },
  {
    name: "Air Force Hangars",
    x: wx(0.35),
    y: wy(0.22),
    w: 170,
    h: 260,
    style: "hangar"
  },
  {
    name: "Tejgaon Railway Station",
    x: wx(0.485),
    y: wy(0.63),
    w: 95,
    h: 210,
    style: "station"
  },
  {
    name: "Nabisco Biscuit Factory",
    x: wx(0.55),
    y: wy(0.22),
    w: 210,
    h: 150,
    style: "factory"
  },
  {
    name: "Kohinoor Chemical & Industrial Sheds",
    x: wx(0.64),
    y: wy(0.38),
    w: 220,
    h: 170,
    style: "factory"
  },
  {
    name: "Channel i / Media Bhaban",
    x: wx(0.54),
    y: wy(0.53),
    w: 185,
    h: 140,
    style: "office"
  },
  {
    name: "BG Press & Govt Printing",
    x: wx(0.63),
    y: wy(0.56),
    w: 190,
    h: 165,
    style: "factory"
  },
  {
    name: "Ananda Cinema & Farmgate Plaza",
    x: wx(0.24),
    y: wy(0.62),
    w: 210,
    h: 145,
    style: "commercial"
  },
  {
    name: "Khamarbari (Dept. of Agriculture)",
    x: wx(0.14),
    y: wy(0.71),
    w: 220,
    h: 150,
    style: "civic"
  },
  {
    name: "Kawran Bazar Kacha Bazar",
    x: wx(0.38),
    y: wy(0.88),
    w: 260,
    h: 170,
    style: "market"
  },
  {
    name: "WASA Bhaban & PetroBangla",
    x: wx(0.26),
    y: wy(0.89),
    w: 180,
    h: 160,
    style: "office"
  },
  {
    name: "Hatirjheel Amphitheater & Bridge",
    x: wx(0.78),
    y: wy(0.43),
    w: 150,
    h: 95,
    style: "bridge"
  }
];
