export type SoundScene = { active: boolean; rain: number; daylight: number };
/** Quiet procedural ambience. No network, microphone, files, speech or world writes. */
export function createSoundscape(context: AudioContext) {
  let scene: SoundScene = { active: false, rain: 0, daylight: 0 }, disposed = false;
  const master = context.createGain(); master.gain.value = .08; master.connect(context.destination);
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate), samples = buffer.getChannelData(0);
  let seed = 92821;
  for (let i = 0; i < samples.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; samples[i] = seed / 2147483648 - 1; }
  const sources: AudioBufferSourceNode[] = [], nodes: AudioNode[] = [master];
  const layer = (type: BiquadFilterType, frequency: number) => {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; source.loop = true; filter.type = type; filter.frequency.value = frequency; gain.gain.value = 0;
    source.connect(filter); filter.connect(gain); gain.connect(master); source.start();
    sources.push(source); nodes.push(source, filter, gain); return gain;
  };
  const wind = layer("lowpass", 420), rain = layer("highpass", 1800);
  const voices = new Map<OscillatorNode,GainNode>();
  const chirp = () => {
    if (disposed || !scene.active || scene.daylight < .35 || scene.rain > .3 || context.state !== "running" || voices.size >= 2) return;
    const now = context.currentTime, voice = context.createOscillator(), gain = context.createGain();
    voice.type = "sine"; voice.frequency.setValueAtTime(2100, now); voice.frequency.exponentialRampToValueAtTime(3400, now + .08); voice.frequency.exponentialRampToValueAtTime(2500, now + .18);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.09, now + .025); gain.gain.linearRampToValueAtTime(0, now + .2);
    voice.connect(gain); gain.connect(master); voices.set(voice,gain);
    voice.onended = () => { voices.delete(voice); voice.disconnect(); gain.disconnect(); };
    voice.start(now); voice.stop(now + .22);
  };
  const timer = setInterval(chirp, 5700);
  return {
    async update(next: SoundScene) {
      if (disposed) return;
      scene = { active: next.active, rain: Math.max(0, Math.min(1, next.rain)), daylight: Math.max(0, Math.min(1, next.daylight)) };
      wind.gain.setTargetAtTime(scene.active ? .2 : 0, context.currentTime, .12);
      rain.gain.setTargetAtTime(scene.active ? scene.rain * .55 : 0, context.currentTime, .12);
      if (!scene.active) {
        for (const voice of voices.keys()) voice.stop();
        if (context.state === "running") await context.suspend();
      } else if (context.state === "suspended") {
        await context.resume();
        // Pause/visibility can change while resume is pending.
        if (!disposed && !scene.active) await context.suspend();
      }
    },
    async dispose() {
      if (disposed) return;
      disposed = true; scene.active = false; clearInterval(timer);
      for (const [voice,gain] of voices) { voice.onended = null; try { voice.stop(); } catch {} voice.disconnect(); gain.disconnect(); }
      voices.clear();
      for (const source of sources) source.stop();
      for (const node of nodes) node.disconnect();
      if (context.state !== "closed") await context.close();
    },
  };
}
