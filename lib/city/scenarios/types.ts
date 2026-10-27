export type Vec3 = [number, number, number];
export type ScenarioId = "wallet-return" | "sanitation-gratitude" | "kitten-care" | "bakery-courtesy";
export type ScenarioClip = "idle" | "walk" | "sprint" | "pick-up" | "holding-right" | "holding-both" | "interact-right" | "emote-yes" | "emote-no" | "sit";
export type CastSpec = {
  id: string; name: string; age: number; ageUnit?: "years" | "months"; role: string;
  modelHint: string; heightMeters: number; radius: number; wardrobe: { shirt: string; trousers: string; accessory?: string };
  species?: "human" | "cat"; mobility?: "crutch";
};
export type ScenarioTheme = {
  skyHex: string[]; groundHex: string; sunElevation: number; kelvin: number;
  phase: string; atmosphere: string; wetness: number;
};
export type EnvironmentProp = { id: string; kind: string; modelHint?: string; position: Vec3; size: Vec3; color: string; solid?: boolean };
export type ShotSpec = { at: number; label: string; lensMm: number; aperture: number; movement: string; targetId: string; offset: Vec3; focusHeight: number };
export type ScenarioDefinition = {
  id: ScenarioId; title: string; subtitle: string; duration: 120; cast: CastSpec[]; theme: ScenarioTheme;
  shots: ShotSpec[]; environment: EnvironmentProp[]; notes: string[];
};
export type ActorFrame = CastSpec & {
  position: Vec3; yaw: number; action: string; clip: ScenarioClip; gesture: string;
  actionStartedAt: number; animationTime: number; animationPhase: number; speedMps: number; travelMeters: number;
  expression: { from: string; to: string; blend: number }; handTargets?: { right?: Vec3; left?: Vec3 };
  carrierId?: string | null;
};
export type PropFrame = {
  id: string; kind: string; modelHint?: string; position: Vec3; rotation: Vec3; size: Vec3; color: string;
  ownerId: string | null; holderId: string | null; attachedTo: string | null; attachment?: "right-hand" | "left-hand" | "both-hands" | "pocket" | "wrap";
  stage: string; visible: boolean;
};
export type ScenarioEvent = { at: number; type: string; actorId?: string; propId?: string; detail: string };
export type ScenarioDialogue = { at: number; until: number; speaker: string; text: string };
export type ScenarioFrame = {
  id: ScenarioId; time: number; duration: 120; complete: boolean; beat: { index: number; label: string; progress: number };
  actors: ActorFrame[]; props: PropFrame[]; environment: EnvironmentProp[];
  camera: { position: Vec3; target: Vec3; lensMm: number; fov: number; aperture: number; movement: string; focusDistance: number };
  theme: ScenarioTheme; dialogue: ScenarioDialogue[]; events: ScenarioEvent[];
  state: Record<string, string | number | boolean | null | string[]>;
};
