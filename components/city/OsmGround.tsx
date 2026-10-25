import { memo } from "react";
import osm from "@/data/city/hcm-district1.json";
const OsmGround = memo(function OsmGround() {
  return (
    <g>
      <rect x="-2000" y="-2000" width="7000" height="6000" fill="#e3e7d8" />
      {osm.features
        .filter((f) => f.kind === "building")
        .map((f, i) => (
          <g key={f.id}>
            <polygon
              points={f.points.map((p) => `${p[0] + 5},${p[1] + 6}`).join(" ")}
              fill="#aebcad"
              opacity=".25"
            />
            <polygon
              points={f.points.map((p) => p.join(",")).join(" ")}
              fill={["#d4c8af", "#c6d3c1", "#ccd4ce", "#dac6b5"][i % 4]}
              stroke="#f5f1e4"
              strokeWidth="1.5"
            />
          </g>
        ))}
      {osm.features
        .filter((f) => f.kind === "road")
        .map((f) => (
          <g key={f.id}>
            <polyline
              points={f.points.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#fbf6e7"
              strokeWidth={
                ["primary", "secondary"].includes(f.category) ? 15 : 8
              }
            />
            <polyline
              points={f.points.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#aabbb0"
              strokeWidth={
                ["primary", "secondary"].includes(f.category) ? 9 : 4
              }
            />
          </g>
        ))}
      {osm.features
        .filter(
          (f) =>
            f.kind === "road" &&
            f.name &&
            ["primary", "secondary"].includes(f.category),
        )
        .slice(0, 14)
        .map((f) => (
          <text
            key={f.id}
            x={f.points[Math.floor(f.points.length / 2)][0]}
            y={f.points[Math.floor(f.points.length / 2)][1]}
            fontSize="11"
            fill="#577460"
          >
            {f.name}
          </text>
        ))}
    </g>
  );
});
export default OsmGround;
