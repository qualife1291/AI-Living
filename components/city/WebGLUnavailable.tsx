"use client";
export function WebGLUnavailable({ retry }: { retry: () => void }) {
  return <div className="webgl-unavailable" role="alert">
    <h2>Chưa mở được không gian 3D</h2>
    <p>Hãy bật tăng tốc đồ họa hoặc thử trình duyệt hỗ trợ WebGL 2. Dữ liệu cư dân vẫn được giữ nguyên.</p>
    <button onClick={retry}>Thử lại 3D</button>
  </div>;
}
