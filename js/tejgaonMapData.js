/**
 * Real-world 1:1 Metric Spatial Layout of Tejgaon, Dhaka.
 * Scale: 1 World Unit = 1.0 Meter
 *
 * Bounding box (~2.44 km North-South x 2.55 km East-West):
 *   Lat: 23.7510° N (South: Kawran Bazar) -> 23.7730° N (North: Mohakhali/Old Airport North)
 *   Lng: 90.3860° E (West: Bijoy Sarani / Old Airport) -> 90.4110° E (East: Hatirjheel)
 *
 * Real-life reference dimensions applied across the map:
 *   - 4-lane Dhaka arterial avenues: 22m–26m wide (~3.5m per lane + median)
 *   - 2-lane collector streets: 12m–14m wide
 *   - Local industrial lanes: 7.5m wide
 *   - Dual-gauge railway corridor: 1.676m broad gauge / 1.0m meter gauge inside 11m ballast bed
 *   - Tejgaon Old Airport Runway (17/35): 1,750m long x 45m wide
 */

export const MAP_CONFIG = {
  width: 2550,
  height: 2440,
  metersPerUnit: 1.0,
  bounds: {
    minLat: 23.7510,
    maxLat: 23.7730,
    minLng: 90.3860,
    maxLng: 90.4110
  },
  // Heart of Tejgaon Industrial Area (Shaheed Tajuddin Ahmed Ave)
  spawn: { x: 1525, y: 1380 }
};

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
 * Zones & Green Grounds
 */
export const ZONES = [
  {
    id: "old_airport",
    name: "Tejgaon Old Airport",
    type: "airfield",
    x: wx(0.11),
    y: wy(0.06),
    w: wx(0.31),
    h: wy(0.45)
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
 * Major & Secondary Roads with true-to-life Dhaka lane widths (in meters)
 */
export const ROADS = [
  // 1. Kazi Nazrul Islam Ave / Airport Road (26m 4-lane divided highway)
  {
    name: "Kazi Nazrul Islam Ave / Airport Rd",
    width: 26,
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
  // 2. Shaheed Tajuddin Ahmed Ave (24m 4-lane main spine)
  {
    name: "Shaheed Tajuddin Ahmed Ave",
    width: 24,
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
  // 3. Bijoy Sarani - Tejgaon Link Road (22m 4-lane East-West connector)
  {
    name: "Bijoy Sarani - Tejgaon Link Rd",
    width: 22,
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
  // 4. Love Road (13m 2-lane industrial collector)
  {
    name: "Love Road",
    width: 13,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.44), y: wy(0.35) },
      { x: wx(0.61), y: wy(0.35) },
      { x: wx(0.77), y: wy(0.35) }
    ]
  },
  // 5. Bir Uttam Mir Shawkat Sarak (16m collector)
  {
    name: "Bir Uttam Mir Shawkat Sarak",
    width: 16,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.44), y: wy(0.18) },
      { x: wx(0.63), y: wy(0.18) },
      { x: wx(0.88), y: wy(0.21) }
    ]
  },
  // 6. Tejgaon Station Road / Kunipara Road (11m)
  {
    name: "Tejgaon Station Road",
    width: 11,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.43), y: wy(0.66) },
      { x: wx(0.59), y: wy(0.66) },
      { x: wx(0.71), y: wy(0.66) }
    ]
  },
  // 7. Panthapath / Kawran Bazar Link (22m 4-lane)
  {
    name: "Kazi Nazrul - Panthapath Link",
    width: 22,
    lanes: 4,
    type: "arterial",
    points: [
      { x: wx(0.04), y: wy(0.85) },
      { x: wx(0.34), y: wy(0.86) },
      { x: wx(0.57), y: wy(0.86) },
      { x: wx(0.74), y: wy(0.82) }
    ]
  },
  // 8. Hatirjheel Ring Road (14m 2-lane scenic road)
  {
    name: "Hatirjheel Ring Road",
    width: 14,
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
  // 9. Farmgate - Khamarbari Road (14m)
  {
    name: "Khamarbari Road",
    width: 14,
    lanes: 2,
    type: "collector",
    points: [
      { x: wx(0.08), y: wy(0.69) },
      { x: wx(0.32), y: wy(0.69) }
    ]
  },
  // 10. Internal Industrial Lanes (8m narrow factory alleys)
  {
    name: "Tejgaon I/A Lane 1",
    width: 8,
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
    width: 8,
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
 * Authentic Tejgaon Landmarks with real-world architectural footprints (in meters)
 */
export const LANDMARKS = [
  {
    // Real Tejgaon Old Airport Runway 17/35: ~1,120m visible stretch x 45m wide
    name: "Tejgaon Old Airport Runway",
    x: wx(0.23),
    y: wy(0.07),
    w: 45,
    h: 980,
    style: "runway"
  },
  {
    name: "BAF Air Force Hangars",
    x: wx(0.34),
    y: wy(0.18),
    w: 95,
    h: 150,
    style: "hangar"
  },
  {
    name: "Tejgaon Railway Station",
    x: wx(0.483),
    y: wy(0.62),
    w: 24,
    h: 120,
    style: "station"
  },
  {
    name: "Nabisco Biscuit Factory",
    x: wx(0.55),
    y: wy(0.22),
    w: 115,
    h: 82,
    style: "factory"
  },
  {
    name: "Kohinoor Chemical & Industrial Sheds",
    x: wx(0.64),
    y: wy(0.38),
    w: 120,
    h: 92,
    style: "factory"
  },
  {
    name: "Channel i / Media Bhaban",
    x: wx(0.54),
    y: wy(0.53),
    w: 96,
    h: 72,
    style: "office"
  },
  {
    name: "BG Press & Govt Printing",
    x: wx(0.63),
    y: wy(0.56),
    w: 110,
    h: 88,
    style: "factory"
  },
  {
    name: "Ananda Cinema & Farmgate Plaza",
    x: wx(0.22),
    y: wy(0.61),
    w: 110,
    h: 78,
    style: "commercial"
  },
  {
    name: "Khamarbari (Dept. of Agriculture)",
    x: wx(0.13),
    y: wy(0.71),
    w: 125,
    h: 84,
    style: "civic"
  },
  {
    name: "Kawran Bazar Kacha Bazar",
    x: wx(0.38),
    y: wy(0.88),
    w: 145,
    h: 92,
    style: "market"
  },
  {
    name: "WASA Bhaban & PetroBangla",
    x: wx(0.25),
    y: wy(0.89),
    w: 88,
    h: 78,
    style: "office"
  },
  {
    // Hatirjheel Overpass Bridge matching road width
    name: "Hatirjheel Overpass Bridge",
    x: wx(0.77),
    y: wy(0.435),
    w: 92,
    h: 26,
    style: "bridge"
  }
];
