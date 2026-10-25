import type { Venue } from "@/lib/city/world";
const palette: Record<string, string> = {
  home: "#d5a583",
  school: "#d8ba78",
  hospital: "#97bdb5",
  clinic: "#abc6bc",
  cinema: "#ac95b8",
  factory: "#99a9a9",
  office: "#8aadb9",
  police: "#8c9fc2",
  airport: "#9cb3bd",
  metro: "#7da99f",
  bus: "#b4bf81",
  market: "#c5a179",
  restaurant: "#d7a47e",
  cafe: "#c99b87",
  library: "#aaad8b",
  workshop: "#a8aaa1",
  culture: "#bc9a95",
  post: "#dbb987",
  fire: "#c59181",
};
export function VenueModel({
  venue,
  lit = false,
}: {
  venue: Venue;
  lit?: boolean;
}) {
  const { type, name } = venue;
  const color = palette[type] ?? "#9db28e";
  if (["square", "park", "garden", "sport"].includes(type))
    return (
      <g>
        <ellipse
          cy="-20"
          rx="72"
          ry="39"
          fill={type === "square" ? "#dbd9be" : "#a9c196"}
          stroke="#f5f0db"
          strokeWidth="6"
        />
        {type === "sport" ? (
          <>
            <rect
              x="-50"
              y="-42"
              width="100"
              height="48"
              rx="4"
              fill="#acc0a1"
              stroke="#f3f3da"
              strokeWidth="2"
            />
            <path d="M0-42v48m-50-24h100" stroke="#eff0d8" fill="none" />
            <circle cy="-18" r="13" stroke="#eff0d8" fill="none" />
          </>
        ) : type === "square" ? (
          <>
            <ellipse
              cy="-22"
              rx="27"
              ry="13"
              fill="#9bbdb9"
              stroke="#ece7d5"
              strokeWidth="7"
            />
            <path
              d="M0-22v-25m-12 22q12-35 24 0"
              stroke="#d5e9df"
              strokeWidth="3"
              fill="none"
            />
          </>
        ) : (
          <>
            {[-35, 0, 35].map((x, i) => (
              <g key={x} transform={`translate(${x} ${-20 - (i % 2) * 10})`}>
                <path d="M0 10v-29" stroke="#937f62" strokeWidth="5" />
                <ellipse
                  cy="-30"
                  rx="21"
                  ry="25"
                  fill={i % 2 ? "#7da382" : "#92b388"}
                />
              </g>
            ))}
          </>
        )}
        <text y="36" textAnchor="middle" fill="#566b59" fontSize="12">
          {name}
        </text>
      </g>
    );
  return (
    <g>
      <ellipse cy="-5" rx="85" ry="25" fill="#526f66" opacity=".1" />
      <path d="M-65-105L42-120L79-82L-27-65Z" fill={color} />
      <path d="M-65-105L-27-65V-5L-65-40Z" fill="#dcdcca" />
      <path d="M-27-65L79-82V-23L-27-5Z" fill="#f2efdf" />
      <path d="M-72-109L43-128L85-83L-28-62Z" fill={color} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <path
            d={`M${-15 + i * 23} ${-49 - i * 3.4}l14-2v15l-14 2Z`}
            fill={lit ? "#ffe5a2" : "#97b6b1"}
            stroke="#fbf8ea"
            strokeWidth="2"
          />
          {["office", "hospital", "school"].includes(type) && (
            <path
              d={`M${-15 + i * 23} ${-77 - i * 3.4}l14-2v15l-14 2Z`}
              fill={lit ? "#ffe8ac" : "#a1bdba"}
              stroke="#f5f4e4"
            />
          )}
        </g>
      ))}
      <path d="M13-25l18-3v25L13 0Z" fill="#8c9d94" />
      {["hospital", "clinic"].includes(type) && (
        <g transform="translate(4 -105)">
          <circle r="14" fill="#f7f4e6" />
          <path d="M0-8V8m-8-8H8" stroke="#c27f75" strokeWidth="5" />
        </g>
      )}
      {type === "school" && (
        <g transform="translate(10 -109)">
          <circle r="12" fill="#faf2db" stroke="#8b9277" strokeWidth="2" />
          <path d="M0-8v8l6 3" fill="none" stroke="#6d8175" strokeWidth="2" />
        </g>
      )}
      {type === "cinema" && (
        <g transform="translate(7 -103)">
          <rect x="-33" y="-13" width="67" height="22" rx="4" fill="#6d6683" />
          {[-24, -12, 0, 12, 24].map((x) => (
            <circle key={x} cx={x} cy="-2" r="2.5" fill="#fbe9ae" />
          ))}
          <text y="-21" textAnchor="middle" fontSize="12" fill="#766b83">
            CINEMA
          </text>
        </g>
      )}
      {type === "factory" && (
        <>
          <path
            d="M-57-112v-65h16v64M30-126v-62h14v65"
            fill="#9baca5"
            stroke="#7d9390"
          />
          <path
            d="M-61-178h24m-11-13h12m-1-12h10"
            stroke="#dce3d9"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </>
      )}
      {type === "police" && (
        <path
          d="M6-126l14 5-2 17-12 8-12-8-2-17Z"
          fill="#f2da9b"
          stroke="#7f93ad"
          strokeWidth="3"
        />
      )}
      {type === "fire" && (
        <path d="M4-126q17 16 4 24q-16-1-9-16l2 6Z" fill="#f6d39c" />
      )}
      {["market", "restaurant", "cafe"].includes(type) && (
        <path
          d="M-35-57L82-75v17L-35-39Z"
          fill={type === "market" ? "#92ad8d" : "#ddb18e"}
          stroke="#f6e6c9"
          strokeWidth="4"
        />
      )}
      {["metro", "bus"].includes(type) && (
        <g transform="translate(1 -107)">
          <rect
            x="-30"
            y="-19"
            width="62"
            height="27"
            rx="8"
            fill="#f1eedb"
            stroke={color}
            strokeWidth="4"
          />
          <text y="1" textAnchor="middle" fontSize="13" fill="#577d70">
            {type === "metro" ? "METRO" : "BUS"}
          </text>
        </g>
      )}
      {type === "airport" && (
        <>
          <path d="M55-119v-73h12v72" fill="#bdcec5" />
          <path
            d="M47-199h28v23H47Z"
            fill="#91b6bc"
            stroke="#e4ece1"
            strokeWidth="3"
          />
          <path
            d="M-3-135v-32l-26-17v-6l30 9 30-9v6L6-167v32Z"
            fill="#f7f6e9"
            stroke="#95aba7"
          />
        </>
      )}
      <rect
        x="-76"
        y="14"
        width="152"
        height="25"
        rx="12"
        fill="#f5f4e8"
        fillOpacity=".88"
      />
      <text y="31" textAnchor="middle" fill="#567064" fontSize="12">
        {name}
      </text>
    </g>
  );
}
