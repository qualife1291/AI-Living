/** Conservative ground disc encloses the entire bicycle and rider at every yaw.
 * Wheels span +/-5.5 with outer radius 3.35: 8.85 units from the root. */
export const BICYCLE_RADIUS = 9.2;
export const BICYCLE_SPEED = 22;
export const BICYCLE_ACCELERATION = 12;
export const BICYCLE_WHEEL_RADIUS = 3;
export type BicycleMotion = { yaw: number; distance: number; radius: number };
