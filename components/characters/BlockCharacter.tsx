import { useId } from "react";
import { themes, type Appearance } from "@/lib/city/appearance";
export function BlockCharacter({
  appearance,
  walking = false,
  speaking = false,
  paused = false,
}: {
  appearance: Appearance;
  walking?: boolean;
  speaking?: boolean;
  paused?: boolean;
}) {
  const theme = themes.find((t) => t.id === appearance.theme) ?? themes[0],
    uid = useId().replaceAll(":", "");
  const hair = {
    black: "#5d625d",
    brown: "#91725a",
    gray: "#b6b7a9",
    bald: "transparent",
  }[appearance.hair];
  return (
    <g
      className={`block-character ${walking ? "block-walking" : ""} ${paused ? "block-paused" : ""}`}
    >
      <defs>
        <linearGradient id={uid + "shirt"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={appearance.shirt} />
          <stop offset="1" stopColor={appearance.shirt} stopOpacity=".83" />
        </linearGradient>
      </defs>
      <ellipse cy="28" rx="23" ry="8" fill="#537565" opacity=".17" />
      <g className="block-leg block-leg-left">
        <rect
          x="-13"
          y="5"
          width="12"
          height="23"
          rx="2"
          fill={appearance.trousers}
        />
        <path d="M-11 8v13m9-13v13" stroke="#fff" strokeOpacity=".12" />
        <rect x="-14" y="23" width="14" height="7" rx="2" fill="#53665e" />
      </g>
      <g className="block-leg block-leg-right">
        <rect
          x="1"
          y="5"
          width="12"
          height="23"
          rx="2"
          fill={appearance.trousers}
        />
        <path d="M4 8v13m7-13v13" stroke="#fff" strokeOpacity=".12" />
        <rect x="1" y="23" width="14" height="7" rx="2" fill="#53665e" />
      </g>
      {theme.pattern === "delivery" && (
        <rect
          x="10"
          y="-24"
          width="14"
          height="27"
          rx="4"
          fill="#5c9c75"
          stroke="#d3e7c9"
          strokeWidth="2"
        />
      )}
      <g className="block-arm block-arm-left">
        <path
          d="M-13-20q-9 1-10 17"
          stroke={appearance.shirt}
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M-22-1q-9-2-8 4q2 6 7 2"
          fill="none"
          stroke={appearance.skin}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <g className="block-arm block-arm-right">
        <path
          d="M13-20q9 1 10 17"
          stroke={appearance.shirt}
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M22-1q9-2 8 4q-2 6-7 2"
          fill="none"
          stroke={appearance.skin}
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M-11-25H11L17 6H-17Z"
        fill={`url(#${uid}shirt)`}
        stroke="#f5f0dc"
        strokeOpacity=".6"
        strokeWidth="1"
      />
      <path d="M-15 4H15" stroke="#64766b" strokeWidth="3" />
      {theme.pattern === "tie" && (
        <>
          <path d="M-7-25L0-17L7-25" fill="#f5f4df" />
          <path d="M0-22l-3 8 3 15 3-15Z" fill="#657987" />
          <path d="M7-16h6m-6 3h5" stroke="#e4cb86" strokeWidth="2" />
        </>
      )}
      {theme.pattern === "coat" && (
        <>
          <path
            d="M-7-25L0 3 7-25M0-17V4"
            fill="none"
            stroke="#b7c9bd"
            strokeWidth="1.5"
          />
          <path d="M8-14v8m-4-4h8" stroke="#88aaa4" strokeWidth="2" />
        </>
      )}
      {["uniform", "delivery", "pocket"].includes(theme.pattern) && (
        <>
          <path
            d="M-11-13h7v6h-7m15-6h7v6H4"
            fill="none"
            stroke="#faf4db"
            strokeOpacity=".8"
          />
          <path d="M0-22V2" stroke="#f4eed8" strokeWidth="1" />
          {theme.pattern === "uniform" && (
            <path d="M7-17l2-3 2 3-1 4H8Z" fill="#e3c581" />
          )}
        </>
      )}
      {theme.pattern === "vest" && (
        <>
          <path
            d="M-9-24L-5 4m14-28L5 4M-14-6h28"
            stroke="#e5e3a4"
            strokeWidth="4"
          />
          <path d="M-10-24L-6 3m16-27L6 3" stroke="#f4f1d2" strokeWidth="1" />
        </>
      )}
      {theme.pattern === "check" && (
        <path
          d="M-13-18h26m-27 8h28m-28 8h28m-21-21V4m7-28V4m7-28V4"
          stroke="#f1e8c9"
          strokeOpacity=".55"
        />
      )}
      {theme.pattern === "stripe" && (
        <path
          d="M-12-16h24m-26 8h28m-29 8h30"
          stroke="#f0e9d0"
          strokeWidth="3"
        />
      )}
      {theme.pattern === "cardigan" && (
        <path
          d="M-5-24L0-12 5-24M0-12V4"
          fill="none"
          stroke="#e9d9c1"
          strokeWidth="2"
        />
      )}
      <rect
        x="-5"
        y="-33"
        width="10"
        height="11"
        rx="2"
        fill={appearance.skin}
      />
      <rect
        x="-13"
        y="-57"
        width="26"
        height="27"
        rx="8"
        fill={appearance.skin}
        stroke="#f7eccd"
        strokeWidth="1"
      />
      <ellipse cy="-54" rx="11" ry="4" fill="#fff" opacity=".15" />
      {appearance.hair !== "bald" && (
        <path
          d="M-14-47q-3-14 8-16q17-5 20 10v9l-4-8q-13 6-19-1l-5 8Z"
          fill={hair}
        />
      )}
      {appearance.face === "glasses" ? (
        <g fill="none" stroke="#65736a" strokeWidth="1.5">
          <rect x="-10" y="-47" width="8" height="6" rx="2" />
          <rect x="2" y="-47" width="8" height="6" rx="2" />
          <path d="M-2-44h4" />
          <circle cx="-6" cy="-44" r="1" fill="#53675f" />
          <circle cx="6" cy="-44" r="1" fill="#53675f" />
        </g>
      ) : (
        <g fill="#53675f">
          <circle cx="-5" cy="-44" r="1.6" />
          <circle cx="5" cy="-44" r="1.6" />
        </g>
      )}
      {appearance.face === "moustache" ? (
        <path d="M0-38q-9-5-10 2q5 4 10-1q5 5 10 1q-1-7-10-2Z" fill={hair} />
      ) : speaking ? (
        <ellipse cy="-36" rx="3" ry="3.5" fill="#9c7865" />
      ) : (
        <path
          d="M-4-37q4 4 8 0"
          fill="none"
          stroke="#967964"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
      {theme.headgear === "helmet" && (
        <>
          <path
            d="M-16-46v-6q0-15 16-15t16 15v6l-5 3v-11H-11v11Z"
            fill={appearance.shirt}
            stroke="#e8f1cf"
            strokeWidth="2"
          />
          <path d="M-12-49h24" stroke="#cae1cd" strokeWidth="3" />
        </>
      )}
      {theme.headgear === "hardhat" && (
        <>
          <path d="M-15-53q0-15 15-15t15 15" fill="#e5c478" stroke="#b6a369" />
          <path
            d="M-19-53h38M0-68v15"
            stroke="#f2d798"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      {["cap", "police", "pilot"].includes(theme.headgear) && (
        <>
          <path d="M-14-55q0-11 14-11t14 11Z" fill={appearance.shirt} />
          <path
            d="M-16-55h32l-9 5h-22Z"
            fill={theme.headgear === "pilot" ? "#586c7d" : appearance.shirt}
            stroke="#d2d7b8"
            strokeWidth="1"
          />
          {theme.headgear === "police" && (
            <circle cy="-60" r="3" fill="#edd18f" />
          )}
        </>
      )}
      {theme.headgear === "chef" && (
        <path
          d="M-12-53v-9q-8-1-5-8q4-6 10-2q7-9 14 0q8-4 11 3q3 7-6 8v8Z"
          fill="#f2efdf"
          stroke="#d6d9c5"
        />
      )}
    </g>
  );
}
