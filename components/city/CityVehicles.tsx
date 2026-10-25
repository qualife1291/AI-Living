import { along, distance, type Point } from "@/lib/life";
import { boulevards, metroLine } from "@/lib/city/world";
export function TransportModel({
  kind,
  color = "#c49378",
}: {
  kind: string;
  color?: string;
}) {
  if (kind === "plane")
    return (
      <g>
        <path
          d="M-40 0l32-7 15-40h9L8-7l35 5v8L8 10 2 31h-8L-9 9-40 5Z"
          fill="#f8f3df"
          stroke="#9dafac"
          strokeWidth="2"
        />
        <path d="M-27 1h20" stroke={color} strokeWidth="4" />
      </g>
    );
  if (["motorbike", "bicycle"].includes(kind))
    return (
      <g>
        <circle cx="-8" cy="7" r="5" fill="#667b73" />
        <circle cx="11" cy="7" r="5" fill="#667b73" />
        <path
          d="M-8 3L0-3l10 7M0-4l4-9 8 1"
          stroke={color}
          strokeWidth="4"
          fill="none"
        />
        <circle cy="-14" r="5" fill="#e3d7b5" />
        <path d="M0-9l-1 10" stroke="#8ba99f" strokeWidth="6" />
      </g>
    );
  const wide = kind === "metro" ? 65 : kind === "bus" ? 41 : 26;
  return (
    <g>
      <rect
        x={-wide / 2}
        y="-11"
        width={wide}
        height="22"
        rx="6"
        fill={color}
        stroke="#edf0df"
        strokeWidth="2"
      />
      {Array.from(
        { length: kind === "metro" ? 6 : kind === "bus" ? 4 : 2 },
        (_, i) => (
          <rect
            key={i}
            x={-wide / 2 + 4 + i * 9}
            y="-6"
            width="6"
            height="7"
            rx="2"
            fill="#d6e5dc"
          />
        ),
      )}
      <circle cx={-wide / 2 + 7} cy="11" r="3" fill="#647c72" />
      <circle cx={wide / 2 - 7} cy="11" r="3" fill="#647c72" />
    </g>
  );
}
export function CityVehicles({ seconds }: { seconds: number }) {
  const vehicles = Array.from({ length: 18 }, (_, i) => {
    const path = boulevards[i % boulevards.length] as Point[];
    const length = path
      .slice(1)
      .reduce((s, p, j) => s + distance(path[j], p), 0);
    const travel =
      (((seconds * (i % 3 === 0 ? 25 : 18) + i * 137) % length) + length) %
      length;
    const position = along(path, travel),
      ahead = along(path, Math.min(length, travel + 2));
    return (
      <g
        key={i}
        transform={`translate(${position.join(" ")}) rotate(${(Math.atan2(ahead[1] - position[1], ahead[0] - position[0]) * 180) / Math.PI})`}
      >
        <TransportModel
          kind={i % 6 === 0 ? "bus" : i % 2 ? "motorbike" : "car"}
          color={["#d7a483", "#9aadb9", "#a7ba8c", "#b6a0b8"][i % 4]}
        />
      </g>
    );
  });
  const track = metroLine as Point[];
  const length = track
    .slice(1)
    .reduce((s, p, i) => s + distance(track[i], p), 0);
  const distanceAlong = (seconds * 30) % length;
  const point = along(track, distanceAlong),
    ahead = along(track, Math.min(length, distanceAlong + 2));
  const airplane: [number, number] = [
    1500 + ((seconds * 38) % 1800),
    1450 - ((seconds * 38) % 1800) * 0.22,
  ];
  return (
    <g>
      {vehicles}
      <g
        transform={`translate(${point.join(" ")}) rotate(${(Math.atan2(ahead[1] - point[1], ahead[0] - point[0]) * 180) / Math.PI})`}
      >
        <TransportModel kind="metro" color="#78a69a" />
      </g>
      <g transform={`translate(${airplane.join(" ")}) scale(.75)`}>
        <TransportModel kind="plane" />
      </g>
    </g>
  );
}
