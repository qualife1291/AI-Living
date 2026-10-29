"use client";
import { useState } from "react";
import {
  themes,
  defaultAppearance,
  type Appearance,
} from "@/lib/city/appearance";
import { AppearancePreview } from "./AppearancePreview";
export function Wardrobe({
  id,
  role,
  modelId,
  initial,
  onSaved,
}: {
  id: string;
  role: string;
  modelId:string;
  initial?: Appearance;
  onSaved: () => Promise<void>;
}) {
  const [appearance, setAppearance] = useState(
      initial ?? defaultAppearance(id, role),
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const snapshotResponse = await fetch("/api/world");
      if (!snapshotResponse.ok)
        throw Error("Chưa đọc được trạng thái thành phố.");
      const snapshot = (await snapshotResponse.json()) as { revision: number };
      const response = await fetch("/api/living/appearance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, appearance, revision: snapshot.revision }),
      });
      if (!response.ok) throw Error("Chưa lưu được tạo hình, hãy thử lại.");
      await onSaved();
      setMessage("Đã lưu tạo hình.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lỗi lưu tạo hình");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wardrobe">
      <div className="wardrobe-preview">
        <AppearancePreview appearance={appearance} modelId={modelId} />
      </div>
      <div className="wardrobe-controls">
        <label>
          Trang phục
          <select
            aria-label="Trang phục"
            value={appearance.theme}
            onChange={(e) => {
              const t = themes.find((t) => t.id === e.target.value)!;
              setAppearance((a) => ({
                ...a,
                theme: t.id,
                shirt: t.shirt,
                trousers: t.trousers,
              }));
            }}
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="wardrobe-colors">
          <label>
            Màu áo
            <input
              type="color"
              value={appearance.shirt}
              onChange={(e) =>
                setAppearance((a) => ({ ...a, shirt: e.target.value }))
              }
            />
          </label>
          <label>
            Quần tây
            <input
              type="color"
              value={appearance.trousers}
              onChange={(e) =>
                setAppearance((a) => ({ ...a, trousers: e.target.value }))
              }
            />
          </label>
          <label>
            Tông da
            <input
              type="color"
              value={appearance.skin}
              onChange={(e) =>
                setAppearance((a) => ({ ...a, skin: e.target.value }))
              }
            />
          </label>
        </div>
        <p>Kiểu tóc và nét mặt được giữ theo mẫu nhân vật.</p>
        <button disabled={busy} onClick={() => void save()}>
          {busy ? "Đang lưu…" : "Lưu tạo hình"}
        </button>
        <p role="status">{message}</p>
      </div>
    </div>
  );
}
