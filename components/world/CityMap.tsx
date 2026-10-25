"use client";

import { crowdAt, livingSpeechAt } from "@/lib/living/engine";
import { observedWeather } from "@/lib/living/realtime";
import { memo, useState } from "react";
import { Maximize2, MapPin, Minus, Plus } from "lucide-react";
import type { World, EpisodeEvent } from "@/lib/world";
import { vehiclesAt, signalAt } from "@/lib/traffic";
import { speechAt, bubbleOffset } from "@/lib/speech";
import { worldTime, weatherAt } from "@/lib/clock";
import { SpeechBubble } from "./SpeechBubble";
import { Vehicle } from "./Vehicle";
import { Robot } from "./Robot";
import { Animal } from "./Animal";
import { useLifeClock } from "./useLife";
import { actorsAt, animalsAt, followView, simulationTime } from "@/lib/life";

export const districts = [
  { id: "all", name: "Toàn khu phố", view: "0 0 1200 780" },
  { id: "home", name: "Khu nhà", view: "65 30 640 420" },
  { id: "social", name: "Phố cà phê", view: "530 40 650 430" },
  { id: "park", name: "Công viên", view: "35 355 680 440" },
];

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy="10" rx="21" ry="9" fill="#537f69" opacity=".14" />
      <path d="M0 7v-30" stroke="#a4896c" strokeWidth="6" />
      <g
        className="tree-canopy"
        style={{
          animationDelay: `${-(x + y) % 7}s`,
          animationDuration: `${4 + (x % 3)}s`,
        }}
      >
        <ellipse cy="-31" rx="24" ry="29" fill="#82a584" />
        <ellipse cx="-8" cy="-38" rx="15" ry="20" fill="#a1bd91" />
        <path
          d="M-5-52q10 7 17 1"
          fill="none"
          stroke="#b6cd9c"
          strokeWidth="2"
        />
      </g>
    </g>
  );
}

function House({
  x,
  y,
  color,
  label,
  kind = "home",
}: {
  x: number;
  y: number;
  color: string;
  label: string;
  kind?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-7 28L89 -21L197 30L95 80Z" fill="#5c7865" opacity=".13" />
      <path d="M0 -30L92 8V65L0 26Z" fill="#f9f1dd" />
      <path d="M92 8L176 -33V24L92 65Z" fill="#e2dfcc" />
      <path d="M-12 -34L71 -75L110 -46L27 -4Z" fill={color} />
      <path d="M27 -4L110 -46L188 -36L96 9Z" fill={color} opacity=".83" />
      <path
        d="M18 -12L43 -2V20L18 10Z"
        className="house-window"
        fill="#99b8b4"
        stroke="#fff9e9"
        strokeWidth="3"
      />
      <path d="M60 5L81 14V58L60 49Z" fill="#9b9382" />
      <path
        d="M117 7L148 -8V13L117 28Z"
        className="house-window"
        style={{ animationDelay: `${-x % 13}s` }}
        fill="#a0beb6"
        stroke="#fff9e9"
        strokeWidth="3"
      />
      {kind === "cafe" && (
        <>
          <g className="cafe-awning">
            <path d="M-6 -12L88 26L88 38L-6 0Z" fill="#d79b76" />
            <path
              d="M10 -6L10 6m22 -3v12m22-3v12m22-3v12"
              stroke="#ffedce"
              strokeWidth="9"
            />
          </g>
          <g className="cafe-steam">
            <path
              d="M145-55q-8-8 0-17m12 15q-8-8 0-17"
              stroke="#fffdf4"
              strokeWidth="3"
              fill="none"
              opacity=".65"
            />
          </g>
        </>
      )}
      {kind === "lab" && (
        <>
          <path
            d="M35 -60L70 -77L112 -60L78 -43Z"
            fill="#6e9caa"
            stroke="#c1dfd9"
            strokeWidth="2"
          />
          <path d="M56 -69L97 -52m-7-15L55 -50" stroke="#b4d6d4" />
          <g className="roof-fan">
            <circle cx="143" cy="-43" r="11" fill="#708e91" />
            <path d="M143-52v18m-9-9h18" stroke="#d7e7dc" strokeWidth="3" />
          </g>
        </>
      )}
      <rect
        x="12"
        y="68"
        width="165"
        height="26"
        rx="13"
        fill="#fffff5"
        stroke="#dce3d5"
      />
      <text
        x="94"
        y="85"
        textAnchor="middle"
        fontSize="12"
        fontWeight="500"
        fill="#53675c"
      >
        {label}
      </text>
    </g>
  );
}

function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0l48 21v8L0 8Z" fill="#be9c77" />
      <path d="M0 -12l48 21v8L0 -4Z" fill="#d1af88" />
      <path d="M5 9v12m37 4v12" stroke="#72887a" strokeWidth="4" />
    </g>
  );
}

function Lamp({ x, y, lit = false }: { x: number; y: number; lit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx="9" ry="4" fill="#45665a" opacity=".13" />
      {lit && (
        <ellipse cx="12" cy="2" rx="32" ry="14" fill="#ffe699" opacity=".22" />
      )}
      <path
        d="M0 0v-46q0-10 13-10"
        stroke="#788d7e"
        strokeWidth="4"
        fill="none"
      />
      <path d="M6 -55q5 -13 15 0Z" fill={lit ? "#ffe28a" : "#efc783"} />
    </g>
  );
}

const LAMP_POSITIONS: readonly [number, number][] = [
  [680, 301],
  [811, 327],
  [1090, 370],
  [472, 269],
  [456, 479],
  [784, 540],
];

const TREE_POSITIONS: readonly [number, number][] = [
  [685, 93],
  [1097, 190],
  [1140, 584],
  [1037, 713],
  [484, 654],
  [75, 371],
  [1090, 104],
  [118, 78],
];

/**
 * Memoized static neighborhood layer (Fixes L6: avoids re-rendering buildings/trees/roads every 75ms).
 */
const StaticScene = memo(function StaticScene({
  lampsLit,
}: {
  lampsLit: boolean;
}) {
  return (
    <>
      <defs>
        <pattern
          id="tiles"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path d="M28 0H0V28" fill="none" stroke="#ddd9c7" strokeWidth=".8" />
        </pattern>
        <pattern
          id="grass"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path d="M12 18l2 -3m2 4l2 -3" stroke="#9fb68a" opacity=".35" />
        </pattern>
        <pattern
          id="rain-pattern"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M20 2L12 26"
            stroke="#9bb8c9"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity=".45"
          />
        </pattern>
      </defs>
      <rect width="1200" height="780" fill="#edf2e6" />
      <path
        d="M20 160Q250 50 470 57L1160 264V650L830 757L69 652Z"
        fill="#e0e9cf"
      />
      <path
        d="M20 160Q250 50 470 57L1160 264V650L830 757L69 652Z"
        fill="url(#grass)"
      />
      <path
        d="M0 254L1200 480M413 0L788 780"
        stroke="#d4d9ca"
        strokeWidth="102"
      />
      <path
        d="M0 254L1200 480M413 0L788 780"
        stroke="#8fa39d"
        strokeWidth="65"
      />
      <path
        d="M0 254L1200 480M413 0L788 780"
        stroke="#e5e7d6"
        strokeWidth="2"
        strokeDasharray="16 17"
      />
      <path d="M80 359L1050 541" stroke="#fbf3de" strokeWidth="45" />
      <path d="M80 359L1050 541" stroke="#ded8c1" strokeWidth="1" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${516 + i * 9} ${315 + i * 2}l-15 34`}
          stroke="#edf0df"
          strokeWidth="5"
        />
      ))}
      <path d="M100 160L332 76L619 172L410 279L100 239Z" fill="#e9e2cc" />
      <path d="M100 160L332 76L619 172L410 279L100 239Z" fill="url(#tiles)" />
      <Tree x={86} y={207} />
      <Tree x={644} y={236} />
      <House x={123} y={143} color="#c28d72" label="01 · Trạm của An" />
      <House x={331} y={103} color="#8eabc4" label="02 · Trạm của Bình" />
      <House x={506} y={177} color="#a8b78a" label="03 · Trạm của Chi" />
      <House
        x={720}
        y={128}
        color="#8ca9ad"
        label="Xưởng sáng tạo"
        kind="lab"
      />
      <House
        x={944}
        y={227}
        color="#c5a377"
        label="Cà phê Mạch Nhỏ"
        kind="cafe"
      />
      <House x={935} y={468} color="#99aaa1" label="Thư viện dữ liệu" />
      <g transform="translate(632 374)">
        <ellipse rx="86" ry="42" fill="#d4d4c0" />
        <ellipse rx="75" ry="34" fill="#f5edda" />
        <ellipse
          cy="-6"
          rx="48"
          ry="22"
          fill="#b1d2cd"
          stroke="#e7eee1"
          strokeWidth="6"
        />
        <ellipse cy="-12" rx="21" ry="10" fill="#7cb2b1" />
        <path
          d="M0 -13v-24m0 0q-18 -9-25 5m25-5q17-10 25 4"
          fill="none"
          stroke="#b0d6d1"
          strokeWidth="4"
        />
        <text y="65" textAnchor="middle" fontSize="13" fill="#708772">
          Quảng trường Kết Nối
        </text>
      </g>
      <g transform="translate(108 466)">
        <path d="M0 22Q80 -76 223 20L305 105L139 181L-20 100Z" fill="#c8dcb9" />
        <path
          d="M5 96Q120 -25 255 95"
          stroke="#eee2bf"
          strokeWidth="23"
          fill="none"
        />
        <ellipse
          cx="94"
          cy="54"
          rx="58"
          ry="29"
          fill="#a5cece"
          stroke="#e8e8d0"
          strokeWidth="7"
        />
        <path
          d="M54 51q30 -13 59 0m-38 9h34"
          stroke="#d8eee6"
          fill="none"
          strokeWidth="2"
        />
        <Bench x={160} y={94} />
        <Tree x={13} y={37} s={1.4} />
        <Tree x={227} y={21} s={1.3} />
        <Tree x={62} y={150} s={1.1} />
        <text x="155" y="201" fontSize="14" textAnchor="middle" fill="#668362">
          Công viên Lá Non
        </text>
      </g>
      <g transform="translate(553 550)">
        <path d="M0 -10L82 -50L175 -7L91 35Z" fill="#d4ae83" />
        <path d="M0 -10L91 35v15L0 4Z" fill="#eac99c" />
        <path
          d="M8 6v54m150 -54v54m-69 -20v64"
          stroke="#ac9779"
          strokeWidth="5"
        />
        <Bench x={45} y={61} />
        <text x="90" y="117" textAnchor="middle" fill="#75876c" fontSize="13">
          Bếp chung
        </text>
      </g>
      <g transform="translate(822 560)">
        <path d="M-25 20L90 -40L229 22L104 87Z" fill="#c5b795" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * 44} ${i * 20})`}>
            <path d="M0 14L90 -30" stroke="#a39573" strokeWidth="18" />
            {[0, 1, 2, 3, 4].map((j) => (
              <g key={j} transform={`translate(${j * 18} ${10 - j * 9})`}>
                <ellipse rx="8" ry="5" fill="#7c9b67" />
                <ellipse cy="-5" rx="4" ry="8" fill="#adc78c" />
              </g>
            ))}
          </g>
        ))}
        <text x="100" y="116" textAnchor="middle" fill="#75876c" fontSize="13">
          Vườn cộng đồng
        </text>
      </g>
      <g transform="translate(1036 304)">
        <path d="M0 0l30-15 29 13-29 15Z" fill="#ecc493" />
        <path d="M30 0v26" stroke="#a68c6c" strokeWidth="3" />
        <ellipse cy="-2" cx="30" rx="32" ry="14" fill="#d6a080" />
      </g>
      {LAMP_POSITIONS.map(([x, y], i) => (
        <Lamp key={i} x={x} y={y} lit={lampsLit} />
      ))}
      {TREE_POSITIONS.map(([x, y], i) => (
        <Tree key={i} x={x} y={y} s={i % 2 ? 0.85 : 1.05} />
      ))}
      <Bench x={713} y={426} />
      <Bench x={782} y={441} />
      <text
        x="153"
        y="335"
        transform="rotate(11 153 335)"
        fill="#667f77"
        fontSize="12"
        letterSpacing="2"
      >
        ĐƯỜNG BÌNH MINH
      </text>
      <text
        x="850"
        y="505"
        transform="rotate(11 850 505)"
        fill="#8b927a"
        fontSize="11"
        letterSpacing="2"
      >
        PHỐ ĐI BỘ
      </text>
    </>
  );
});

export function CityMap({
  world,
  onSelect,
  selected,
  events = [],
  clockOffsetMs = 0,
}: {
  world: World;
  onSelect: (id: string) => void;
  selected: string;
  events?: EpisodeEvent[];
  clockOffsetMs?: number;
}) {
  const now = useLifeClock(world.paused, clockOffsetMs);
  const time = now ?? Date.parse(world.born);
  const wt = worldTime(world, time);
  const baseWeather =
    (!world.clock?.weatherOverride &&
      world.realContext &&
      observedWeather(world.realContext)) ||
    weatherAt(world.born || "xom-ai", wt, world.clock?.weatherOverride);
  const weather = {
    ...baseWeather,
    label:
      baseWeather.label +
      (world.clock?.weatherOverride
        ? " · thử nghiệm"
        : !world.realContext || world.realContext.weather.status !== "fresh"
          ? " · mô phỏng"
          : ""),
  };
  const actors = actorsAt(world, time);
  const wildlife = animalsAt(world, time);
  const crowd = world.living ? crowdAt(world.living, world, time) : [];
  const speech =
    livingSpeechAt(world, time) ?? speechAt(world, actors, events, time);
  const traffic = vehiclesAt(world, time);
  const signal = signalAt(simulationTime(world, time) / 1000);

  const [follow, setFollow] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [area, setArea] = useState("all");
  const [zoom, setZoom] = useState(false);

  const selectedActor = actors.find((a) => a.id === selected) ?? actors[0];
  const camera: [number, number] = selectedActor
    ? selectedActor.position
    : [600, 390];

  const d = districts.find((dist) => dist.id === area) ?? districts[0];
  const [vx, vy, vw, vh] = d.view.split(" ").map(Number);
  const view = zoom
    ? `${vx + vw * 0.15} ${vy + vh * 0.15} ${vw * 0.7} ${vh * 0.7}`
    : d.view;
  const activeViewBox = follow ? followView(camera) : view;
  const lampsLit =
    wt.phase === "dusk" || wt.phase === "evening" || wt.phase === "night";
  const nightOpacity = Number(((1 - wt.daylight) * 0.24).toFixed(3));

  return (
    <div className={`city-experience ${world.paused ? "scene-paused" : ""}`}>
      <div className="districts" aria-label="Khu vực bản đồ">
        {districts.map((dist) => (
          <button
            key={dist.id}
            onClick={() => {
              setArea(dist.id);
              setZoom(false);
              setFollow(false);
            }}
            className={area === dist.id && !follow ? "current" : ""}
          >
            {dist.id === "all" && <MapPin size={13} />} {dist.name}
          </button>
        ))}
        <button
          className={follow ? "current" : ""}
          onClick={() => setFollow(!follow)}
          aria-pressed={follow}
        >
          ◎ Theo {world.people.find((p) => p.id === selected)?.name}
        </button>
        <button
          className={showPaths ? "current" : ""}
          onClick={() => setShowPaths(!showPaths)}
          aria-pressed={showPaths}
        >
          Đường đi
        </button>
      </div>

      <div className="city-viewport">
        {/* Fixes L9: role="group" instead of role="img" so interactive robot buttons remain accessible */}
        <svg
          className="map city-map"
          viewBox={activeViewBox}
          role="group"
          aria-label="Khu phố AI rộng mở: khu nhà, đường phố, công viên, quán cà phê, xưởng sáng tạo, thư viện và vườn cộng đồng"
        >
          <title>
            Bản đồ Khu phố Xóm AI ({wt.phaseLabel} · {weather.label})
          </title>
          <StaticScene lampsLit={lampsLit} />
          {[
            { x: 170, y: 490, label: "Phòng khám", icon: "+" },
            { x: 1080, y: 580, label: "Lớp học", icon: "▤" },
            { x: 735, y: 515, label: "Chợ nhỏ", icon: "◇" },
          ].map((place) => (
            <g
              key={place.label}
              transform={`translate(${place.x} ${place.y - 22})`}
            >
              <rect
                x="-26"
                y="-30"
                width="52"
                height="33"
                rx="7"
                fill="#faf5e7"
                stroke="#8fa797"
              />
              <text y="-9" textAnchor="middle" fill="#567566" fontSize="20">
                {place.icon}
              </text>
              <text y="16" textAnchor="middle" fill="#476553" fontSize="10">
                {place.label}
              </text>
            </g>
          ))}
          {crowd.map((actor) => {
            const resident = world.living!.residents.find(
              (r) => r.id === actor.id,
            )!;
            return (
              <g
                key={actor.id}
                transform={`translate(${actor.position[0]} ${actor.position[1]})`}
                className={
                  actor.walking ? "crowd-neighbor walking" : "crowd-neighbor"
                }
              >
                <title>
                  {resident.name} · {actor.activity}
                </title>
                {speech?.speaker === actor.id && (
                  <SpeechBubble
                    speech={speech}
                    shift={
                      bubbleOffset(
                        actor.position,
                        activeViewBox,
                        speech.text,
                      ) ?? [0, 0]
                    }
                  />
                )}
                <ellipse cy="7" rx="8" ry="4" fill="#34534b" opacity=".12" />
                <rect
                  x="-6"
                  y="-11"
                  width="12"
                  height="16"
                  rx="4"
                  fill={resident.color}
                />
                <rect
                  x="-7"
                  y="-23"
                  width="14"
                  height="12"
                  rx="5"
                  fill="#eff2e7"
                  stroke={resident.color}
                />
                <circle cx="-3" cy="-17" r="1.3" fill="#506e64" />
                <circle cx="3" cy="-17" r="1.3" fill="#506e64" />
                <path
                  d="M-3 3v7m6-7v7"
                  stroke={resident.color}
                  strokeWidth="3"
                />
              </g>
            );
          })}

          {traffic.map((v) => (
            <Vehicle key={v.id} vehicle={v} />
          ))}

          <g
            transform="translate(530 328)"
            aria-label={
              signal.main ? "Đèn xe đường chính xanh" : "Đèn xe đường chính đỏ"
            }
          >
            <path d="M0 0v-33" stroke="#6e8780" strokeWidth="4" />
            <rect x="-6" y="-50" width="12" height="26" rx="4" fill="#506a67" />
            <circle cy="-43" r="3" fill={signal.main ? "#936c64" : "#e4a18b"} />
            <circle cy="-31" r="3" fill={signal.main ? "#b0d995" : "#61776d"} />
          </g>
          <g transform="translate(649 404)">
            <path d="M0 0v-33" stroke="#6e8780" strokeWidth="4" />
            <rect x="-6" y="-50" width="12" height="26" rx="4" fill="#506a67" />
            <circle
              cy="-43"
              r="3"
              fill={signal.avenue ? "#936c64" : "#e4a18b"}
            />
            <circle
              cy="-31"
              r="3"
              fill={signal.avenue ? "#b0d995" : "#61776d"}
            />
          </g>

          {showPaths &&
            actors.map((a) => (
              <polyline
                key={a.id}
                points={a.path.map((p) => p.join(",")).join(" ")}
                fill="none"
                stroke={world.people.find((p) => p.id === a.id)!.color}
                strokeWidth="4"
                strokeDasharray="7 7"
                opacity=".8"
              />
            ))}

          {wildlife.map((a) => (
            <g
              key={a.id}
              transform={`translate(${a.position[0] + 35} ${a.position[1] + 24})`}
              className={a.walking ? "animal-walking" : ""}
            >
              <title>
                {a.name}: {a.activity}
              </title>
              <g
                transform={
                  a.walking && a.position[0] < 600 ? "scale(-1 1)" : undefined
                }
              >
                <Animal
                  species={a.species}
                  walking={a.walking}
                  resting={!a.walking && a.kind === "rest"}
                />
              </g>
              <text y="31" textAnchor="middle" fontSize="10" fill="#6b8168">
                {a.name}
              </text>
            </g>
          ))}

          {actors
            .slice()
            .sort((a, b) => a.position[1] - b.position[1])
            .map((a) => {
              const p = world.people.find((person) => person.id === a.id)!;
              const activeSpeech = speech?.speaker === a.id ? speech : null;
              const bubbleShift = activeSpeech
                ? bubbleOffset(a.position, activeViewBox, activeSpeech.text)
                : null;

              return (
                <g
                  key={p.id}
                  transform={`translate(${a.position[0]} ${a.position[1]})`}
                  className={
                    "map-person " +
                    (a.walking ? "walking " : "") +
                    (world.paused ? "resting" : "")
                  }
                  role="button"
                  tabIndex={0}
                  aria-label={`Xem robot ${p.name}`}
                  onClick={() => onSelect(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(p.id);
                    }
                  }}
                >
                  {selected === p.id && (
                    <ellipse
                      cy="29"
                      rx="31"
                      ry="13"
                      fill="none"
                      stroke="#5c8e7d"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                  )}
                  <g
                    className={
                      "character " + (!a.walking ? "doing-" + a.kind : "")
                    }
                  >
                    <Robot
                      person={p}
                      motion={a.walking ? "walk" : a.kind}
                      speaking={!!activeSpeech}
                      paused={world.paused}
                    />
                    {!a.walking && a.kind === "garden" && (
                      <>
                        <path d="M18 2l14 8-4 7-13-7Z" fill="#8cafa7" />
                        <path
                          d="M33 10l15 8"
                          stroke="#9bc6cd"
                          strokeWidth="2"
                          strokeDasharray="2 3"
                        />
                      </>
                    )}
                    {!a.walking && a.kind === "read" && (
                      <path
                        d="M-14 3l14 3 14-3v17L0 23l-14-3Z"
                        fill="#e4d4a3"
                        stroke="#968b65"
                      />
                    )}
                    {!a.walking && a.kind === "work" && (
                      <>
                        <path
                          d="M18 -4l12 10"
                          stroke="#91a4a0"
                          strokeWidth="4"
                        />
                        <text x="28" y="-8" fontSize="18" fill="#d5b16d">
                          ✦
                        </text>
                      </>
                    )}
                    {!a.walking && a.kind === "rest" && (
                      <text x="28" y="-27" fill="#879c94" fontSize="13">
                        z z
                      </text>
                    )}
                  </g>
                  <rect
                    x="-31"
                    y="-94"
                    width="62"
                    height="23"
                    rx="11.5"
                    fill="#fffef7"
                    stroke={p.color}
                  />
                  <text
                    y="-78"
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="#526c63"
                  >
                    {p.name} · AI
                  </text>
                  {activeSpeech && bubbleShift && (
                    <SpeechBubble speech={activeSpeech} shift={bubbleShift} />
                  )}
                </g>
              );
            })}

          {weather.kind === "rain" && (
            <rect
              width="1200"
              height="780"
              fill="url(#rain-pattern)"
              pointerEvents="none"
            />
          )}
          {nightOpacity > 0.02 && (
            <rect
              width="1200"
              height="780"
              fill={wt.phase === "dusk" ? "#4a3b5c" : "#1d2d44"}
              opacity={nightOpacity}
              pointerEvents="none"
            />
          )}

          <g transform="translate(47 727)">
            <circle r="17" fill="#fffdf3" />
            <path d="M-5 7L0 -9L5 7L0 4Z" fill="#6e887d" />
            <text x="28" y="4" fill="#7e927e" fontSize="12">
              Xóm AI · {wt.phaseLabel} · {weather.label}
            </text>
          </g>
        </svg>

        <div className="map-controls">
          <button
            onClick={() => setZoom(!zoom)}
            aria-label={zoom ? "Thu nhỏ bản đồ" : "Phóng to bản đồ"}
          >
            {zoom ? <Minus size={18} /> : <Plus size={18} />}
          </button>
          <button
            onClick={() => {
              setArea("all");
              setZoom(false);
              setFollow(false);
            }}
            aria-label="Xem toàn bộ khu phố"
          >
            <Maximize2 size={17} />
          </button>
        </div>
      </div>

      <div className="traffic-status">
        <span className={signal.main ? "green-light" : ""} />
        Đường chính {signal.main ? "đang xanh" : "đang đỏ"}
        <span className={signal.avenue ? "green-light" : ""} />
        Đường dọc {signal.avenue ? "đang xanh" : "đang đỏ"}
        <span className={signal.pedestrian ? "green-light" : ""} />
        Lối đi bộ {signal.pedestrian ? "được qua" : "chờ đèn"}
        <small>Xe chờ đèn tại giao lộ · chuyển động mô phỏng</small>
      </div>

      <div className="map-legend">
        <span>
          <i style={{ background: "#c28d72" }} />
          Khu sinh hoạt
        </span>
        <span>
          <i style={{ background: "#82a584" }} />
          Thiên nhiên
        </span>
        <span>
          <i style={{ background: "#8ca9ad" }} />
          Học tập & sáng tạo
        </span>
        <span>Chọn robot · bật Theo để camera di chuyển</span>
      </div>

      <div className="life-board">
        <div className="life-heading">
          <b>Nhịp sống trong xóm (Đang mô phỏng)</b>
          <span>
            {world.paused ? "Đang tạm nghỉ" : "Đi lại & công việc theo luật"} ·
            Sinh hoạt theo giờ Việt Nam
          </span>
        </div>
        <div className="life-actors">
          {actors.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onSelect(a.id);
                setFollow(true);
              }}
              className={a.id === selected ? "active" : ""}
            >
              <i
                style={{
                  background: world.people.find((p) => p.id === a.id)!.color,
                }}
              />
              <div>
                <b>{a.name}</b>
                <span>{a.activity}</span>
                <small>
                  {a.walking ? `Từ ${a.from} → ${a.location}` : a.location} ·{" "}
                  {a.source === "plan"
                    ? world.people.find((p) => p.id === a.id)?.plan
                        ?.generator === "rules"
                      ? "Kế hoạch sinh hoạt"
                      : "Kế hoạch AI"
                    : "Lịch sinh hoạt"}
                </small>
              </div>
            </button>
          ))}
        </div>

        {events[0] && (
          <details className="recorded-conversation">
            <summary>Chuyện đã lưu: {events[0].title}</summary>
            <p>{events[0].summary}</p>
            {events[0].dialogue?.map((d, i) => (
              <p key={i}>
                <b>{world.people.find((p) => p.id === d.speaker)?.name}: </b>
                {d.text}
              </p>
            ))}
          </details>
        )}

        <div className="animal-strip">
          {wildlife.map((a) => (
            <span key={a.id}>
              <b>{a.name}</b> · {a.activity}
            </span>
          ))}
        </div>

        <button
          className="text-button"
          onClick={() => setShowInfo(!showInfo)}
          aria-expanded={showInfo}
        >
          Tập tính động vật & cách mô phỏng {showInfo ? "−" : "+"}
        </button>

        {showInfo && (
          <div className="animal-info">
            <p>
              Mướp nghỉ và chơi với đồ chơi; Cún khám phá bằng mùi và mời chơi;
              đàn sẻ nhảy, kiếm hạt và đi theo đàn. Đây là mô phỏng bằng luật,
              dựa trên tài liệu hành vi; các con vật không nói tiếng người.
            </p>
            <a
              href="https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-and-play"
              target="_blank"
              rel="noreferrer"
            >
              Cats Protection · mèo chơi
            </a>
            <a
              href="https://www.rspca.org.uk/en/adviceandwelfare/pets/dogs/behaviour/understanding"
              target="_blank"
              rel="noreferrer"
            >
              RSPCA · ngôn ngữ cơ thể chó
            </a>
            <a
              href="https://www.allaboutbirds.org/guide/House_Sparrow/lifehistory"
              target="_blank"
              rel="noreferrer"
            >
              Cornell Lab · tập tính sẻ
            </a>
            <p>
              Đường đi và camera là mô phỏng liên tục trong trình duyệt. Ký ức,
              tiền và kỹ năng chỉ thay đổi qua sự kiện đã lưu; kế hoạch AI được
              ưu tiên khi có. Hội thoại AI được ghi riêng trong Nhật ký.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
