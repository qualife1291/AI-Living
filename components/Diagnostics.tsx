"use client";
import { useEffect, useState } from "react";
import { clientLogs, diagnosticSummary, flushClientLogs, logClient } from "../lib/diagnostics";
export function Diagnostics() {
  const [debug, setDebug] = useState(false), [summary, setSummary] = useState<ReturnType<typeof diagnosticSummary>>({ pending: 0, frameP95: null });
  useEffect(() => {
    const startup = setTimeout(() => setDebug(new URLSearchParams(location.search).get("debug") === "1"), 0);
    let observer: PerformanceObserver | undefined;
    if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      observer = new PerformanceObserver(list => list.getEntries().forEach(e => logClient("longtask", { ms: e.duration })));
      observer.observe({ type: "longtask", buffered: true });
    }
    const timer = setInterval(() => { setSummary(diagnosticSummary()); void flushClientLogs(); }, 15000);
    return () => { clearTimeout(startup); clearInterval(timer); observer?.disconnect(); };
  }, []);
  if (!debug) return null;
  const download = (text: string) => { const url = URL.createObjectURL(new Blob([text], { type: "application/x-ndjson" })); const a = document.createElement("a"); a.href = url; a.download = "xom-diagnostics.jsonl"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <aside style={{ position: "fixed", bottom: 8, right: 8, zIndex: 9999, padding: 12, background: "#fff", color: "#111", border: "1px solid #888", borderRadius: 8 }}>
    <b>Chẩn đoán</b><div>Log chờ gửi: {summary.pending}</div><div>p95 mẫu frame: {summary.frameP95?.toFixed(1) ?? "—"} ms</div>
    <button onClick={() => download(clientLogs().map(r => JSON.stringify(r)).join("\n"))}>Xuất log chưa gửi</button>{" "}
    <button onClick={async () => { const r = await fetch("/api/diagnostics"); if (r.ok) download(await r.text()); else alert("Không đọc được log: " + r.status); }}>Xuất log server</button>
  </aside>;
}
