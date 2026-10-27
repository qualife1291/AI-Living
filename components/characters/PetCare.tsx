"use client";
import { useState } from "react";
import type { World } from "@/lib/world";
import { petOwners } from "@/lib/living/pets";
export function PetCare({ world, refresh }: { world: World; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const owners = petOwners(world), people = [...world.people, ...(world.living?.residents ?? [])];
  async function save(pet: string, owner: string) {
    setBusy(true); setMessage("");
    try {
      const snapshot = await fetch("/api/world"); if (!snapshot.ok) throw Error("Chưa đọc được trạng thái thành phố.");
      const { revision } = await snapshot.json() as { revision: number };
      const response = await fetch("/api/living/pets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pet, owner: owner || null, revision }) });
      if (!response.ok) throw Error("Chưa lưu được người chăm sóc. Hãy thử lại.");
      await refresh(); setMessage("Đã lưu người chăm sóc.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa lưu được."); }
    finally { setBusy(false); }
  }
  return <details className="pet-care"><summary>Người chăm sóc thú cưng</summary>
    <p>Cún và Mướp đi theo người chăm sóc khi người đó chọn hoạt động dắt thú đi dạo. Người đi dạo sẽ chờ nếu thú còn ở xa.</p>
    {[["cun", "Cún"], ["muop", "Mướp"]].map(([id, name]) => <label key={id}>{name}<select aria-label={`Người chăm sóc ${name}`} value={owners[id] ?? ""} disabled={busy} onChange={e => void save(id, e.target.value)}>
      <option value="">Chưa phân công</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>)}
    <p role="status">{message}</p>
  </details>;
}
