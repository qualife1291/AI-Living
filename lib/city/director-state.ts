/** Versioned serializable kinematics, without world memory/policies or Three.js. */
import { z } from 'zod';
/** 240 residents + three core + nine animal policy groups. */
export const MAX_WORLD_BODIES=252;
export const directorPoint = z.tuple([z.number().finite().min(-5000).max(5000), z.number().finite().min(-5000).max(5000)]);
const number = z.number().finite(), positive = number.nonnegative(), id = z.string().regex(/^[a-z][a-z0-9-]{0,99}$/);
export const tagStateSchema = z.array(z.tuple([z.string().max(220), z.object({ a:id,b:id,location:z.string().max(100),chaser:id,grace:positive.max(2),armed:z.boolean(),swaps:positive.int(),goal:directorPoint,runner:id }).strict()])).max(123);
export const petStateSchema = z.array(id).max(243);
export const walkStateSchema = z.object({
  version:z.literal(1),born:z.string().max(100),lastTime:number.nullable(),tag:tagStateSchema,pets:petStateSchema,
  walkers:z.array(z.tuple([id,z.object({position:directorPoint,requested:directorPoint,goal:directorPoint,path:z.array(directorPoint).min(1).max(512),next:positive.int().max(512),idle:positive,heading:number,velocity:directorPoint,blocked:positive,replanIn:positive,radius:z.union([z.literal(4.8),z.literal(9.2)]),speed:positive.max(28),distance:positive}).strict()])).max(MAX_WORLD_BODIES),
}).strict();
export const trafficStateSchema = z.object({version:z.literal(1),previousTime:number.nullable(),positions:z.array(positive.max(1e15)).max(12),speeds:z.array(positive.max(24.000001)).max(12)}).strict();
export type WalkDirectorState = z.infer<typeof walkStateSchema>;
export type TrafficDirectorState = z.infer<typeof trafficStateSchema>;
