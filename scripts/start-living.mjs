// Start only this checkout's local services. Signals stop children we started.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500).unref();
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
async function healthy(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
    await r.text();
    return r.ok;
  } catch {
    return false;
  }
}
async function ensure(label, url, command, args) {
  if (await healthy(url)) {
    console.log(`${label}: reusing existing local service`);
    return;
  }
  const child = spawn(command, args, { stdio: "inherit", env: process.env });
  children.push(child);
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
  for (let i = 0; i < 60; i++) {
    if (await healthy(url)) {
      console.log(`${label}: ready`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw Error(`${label} did not become ready`);
}
try {
  await ensure(
    "Context relay",
    "http://127.0.0.1:8091/health",
    process.execPath,
    ["--use-env-proxy", "scripts/context-relay.mjs"],
  );
  await ensure("Local AI", "http://127.0.0.1:8090/health", "bash", [
    "scripts/start-local-ai.sh",
  ]);
  await ensure("World", "http://127.0.0.1:5173/api/health", process.execPath, [
    "scripts/run-framework.mjs",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
  ]);
  const daemon = spawn(process.execPath, ["scripts/living-daemon.mjs"], {
    stdio: "inherit",
    env: process.env,
  });
  children.push(daemon);
  daemon.on("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
  console.log("Living world local services ready. Keep this process running.");
} catch (error) {
  console.error(error.message);
  stop(1);
}
