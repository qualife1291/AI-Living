import venuesData from "../../data/city/venues.json" with { type: "json" };
export type Venue = (typeof venuesData)[number];
export const venues = venuesData;
export const boulevards: number[][][] = [
  [
    [1500, 900],
    [1050, 1140],
  ],
  [
    [30, 385],
    [1220, 450],
    [2360, 450],
  ],
  [
    [1250, 50],
    [1340, 450],
    [1500, 900],
    [1450, 1450],
  ],
  [
    [2120, 50],
    [2120, 800],
    [1950, 1140],
    [2350, 1450],
  ],
  [
    [100, 1140],
    [1050, 1140],
    [1950, 1140],
  ],
  [
    [600, 600],
    [1050, 1140],
  ],
  [
    [1500, 900],
    [2120, 800],
  ],
];
export const metroLine: number[][] = [
  [120, 1400],
  [450, 1140],
  [1050, 1140],
  [1500, 1040],
  [1950, 1140],
  [2320, 1340],
];
