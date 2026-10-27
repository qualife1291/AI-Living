"use client";
import { lazy, Suspense, memo, useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Plus, Scan } from "lucide-react";
import type { World } from "@/lib/world";
import { actorsAt, animalsAt, simulationTime, type Point } from "@/lib/life";
import { crowdAt, livingSpeechAt } from "@/lib/living/engine";
import { SocialDirector } from "@/lib/living/social";
import { worldTime } from "@/lib/clock";
import { useLifeClock } from "@/components/world/useLife";
import { BlockCharacter } from "@/components/characters/BlockCharacter";
import { defaultAppearance } from "@/lib/city/appearance";
import { Animal } from "@/components/world/Animal";
import {
  venues,
  boulevards,
  metroLine,
  cameraView,
  type Venue,
} from "@/lib/city/world";
import { VenueModel } from "./VenueModel";
import { CityVehicles, TransportModel } from "./CityVehicles";

const CityGround = memo(function CityGround({ lit }: { lit: boolean }) {
  return (
    <g>
      <rect x="-2000" y="-2000" width="7000" height="6000" fill="#dbe4cd" />
      <path
        d="M-200 1000Q600 1500 800 1550T2600 1700"
        fill="none"
        stroke="#b7d4cd"
        strokeWidth="130"
      />
      {boulevards.map((p, i) => (
        <g key={i}>
          <polyline
            points={p.map((v) => v.join(",")).join(" ")}
            fill="none"
            stroke="#eee8d5"
            strokeWidth="62"
            strokeLinejoin="round"
          />
          <polyline
            points={p.map((v) => v.join(",")).join(" ")}
            fill="none"
            stroke="#9daea7"
            strokeWidth="37"
            strokeLinejoin="round"
          />
          <polyline
            points={p.map((v) => v.join(",")).join(" ")}
            fill="none"
            stroke="#e1e3cf"
            strokeWidth="1.5"
            strokeDasharray="11 14"
          />
        </g>
      ))}
      <polyline
        points={metroLine.map((v) => v.join(",")).join(" ")}
        fill="none"
        stroke="#8b9c91"
        strokeWidth="14"
        strokeLinejoin="round"
      />
      <polyline
        points={metroLine.map((v) => v.join(",")).join(" ")}
        fill="none"
        stroke="#e5e7d4"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <polyline
        points={metroLine.map((v) => v.join(",")).join(" ")}
        fill="none"
        stroke="#9dad9e"
        strokeWidth="2"
        strokeDasharray="2 7"
      />
      <g opacity=".36" fontSize="14" letterSpacing="5" fill="#627d6c">
        <text x="1330" y="100">
          KHU HỌC TẬP & Y TẾ
        </text>
        <text x="1850" y="550">
          VIỆC LÀM & SÁNG TẠO
        </text>
        <text x="270" y="900">
          SINH HOẠT CỘNG ĐỒNG
        </text>
        <text x="1730" y="1435">
          CỬA NGÕ THÀNH PHỐ
        </text>
      </g>
      {Array.from({ length: 70 }, (_, i) => {
        const x = (i * 379 + 51) % 2390,
          y = (i * 193 + 100) % 1460;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cy="9" rx="15" ry="7" fill="#6c8976" opacity=".12" />
            <path d="M0 5v-29" stroke="#9b8a6c" strokeWidth="4" />
            <ellipse
              cy="-26"
              rx="17"
              ry="23"
              fill={i % 2 ? "#9cba8c" : "#83a785"}
            />
          </g>
        );
      })}
      {venues
        .slice()
        .sort((a, b) => a.y - b.y)
        .map((v) => (
          <g key={v.name} transform={`translate(${v.x} ${v.y})`}>
            <VenueModel venue={v} lit={lit} />
          </g>
        ))}
    </g>
  );
});
const OsmGround = lazy(() => import("./OsmGround"));

export function UrbanMap({
  world,
  selected,
  onSelect,
  onVenue,
  onInspect,
  mode = "city",
  clockOffsetMs = 0,
  target,
  events = [],
}: {
  world: World;
  selected: string;
  onSelect: (id: string) => void;
  onVenue: (venue: Venue) => void;
  onInspect: () => void;
  mode?: "city" | "osm";
  clockOffsetMs?: number;
  quality?: import("@/lib/city/scale").Quality;
  events?: import("@/lib/world").EpisodeEvent[];
  target?: { x: number; y: number; key: number } | null;
}) {
  const [director] = useState(() => new SocialDirector());
  const now = useLifeClock(world.paused, clockOffsetMs),
    time = now ?? Date.parse(world.born);
  const actors = actorsAt(world, time),
    crowd = world.living ? crowdAt(world.living, world, time, selected) : [],
    frame = director.frame(world, [...actors, ...crowd], events, time, livingSpeechAt(world, time)),
    all = frame.actors.sort((a, b) => a.position[1] - b.position[1]);
  const current = all.find((a) => a.id === selected) ?? actors[0];
  const wt = worldTime(world, time),
    speech = (frame.exchanges.find(e => e.a === selected || e.b === selected) ?? frame.exchanges[0])?.speech;
  const [following, setFollowing] = useState(true),
    [zoom, setZoom] = useState(1.45),
    [center, setCenter] = useState<Point>([1100, 700]),
    [aspect, setAspect] = useState(1.6);
  const host = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; center: Point } | null>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (rect.height) setAspect(rect.width / rect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      setFollowing(false);
      setCenter([target.x, target.y]);
      setZoom(1.5);
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const focus: Point =
    following && mode === "city" && current ? current.position : center;
  const view = cameraView(focus, zoom, aspect),
    [vx, vy, vw, vh] = view.split(" ").map(Number);
  function inspect(v: Venue) {
    setFollowing(false);
    setCenter([v.x, v.y]);
    setZoom(1.5);
    onVenue(v);
  }
  return (
    <div ref={host} className="urban-map-host">
      <svg
        className="urban-map"
        viewBox={view}
        role="group"
        aria-label={
          mode === "city"
            ? "Thành phố sống của An"
            : "Tái dựng công trình và đường từ OpenStreetMap TP.HCM"
        }
        onWheel={(e) =>
          setZoom((z) =>
            Math.max(0.18, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))),
          )
        }
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[role="button"]')) return;
          drag.current = { x: e.clientX, y: e.clientY, center: focus };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          setFollowing(false);
          setCenter([
            drag.current.center[0] -
              ((e.clientX - drag.current.x) * vw) / rect.width,
            drag.current.center[1] -
              ((e.clientY - drag.current.y) * vh) / rect.height,
          ]);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {mode === "osm" ? (
          <Suspense
            fallback={
              <text x={vx + 30} y={vy + 60} fill="#5b7665">
                Đang mở bản đồ TP.HCM…
              </text>
            }
          >
            <OsmGround />
          </Suspense>
        ) : (
          <>
            <CityGround lit={wt.daylight < 0.4} />
            {venues.map((v) => (
              <g
                key={v.name}
                transform={`translate(${v.x} ${v.y})`}
                role="button"
                tabIndex={0}
                aria-label={`Khám phá ${v.name}`}
                onClick={() => inspect(v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    inspect(v);
                  }
                }}
              >
                <rect
                  x="-80"
                  y="-160"
                  width="165"
                  height="200"
                  fill="transparent"
                />
              </g>
            ))}
            <CityVehicles seconds={simulationTime(world, time) / 1000} />
            {animalsAt(world, time).map((a) => (
              <g
                key={a.id}
                transform={`translate(${a.position.join(" ")}) scale(.8)`}
              >
                <Animal species={a.species} walking={a.walking} />
              </g>
            ))}
            {all.map((a) => {
              const person = world.people.find((p) => p.id === a.id),
                npc = world.living?.residents.find((p) => p.id === a.id);
              const color = person?.color ?? npc?.color ?? "#9eb5a4";
              return (
                <g
                  key={a.id}
                  transform={`translate(${a.position.join(" ")})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Theo dõi ${a.name}`}
                  onClick={() => {
                    onSelect(a.id);
                    setFollowing(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(a.id);
                      setFollowing(true);
                    }
                  }}
                >
                  {selected === a.id && (
                    <ellipse
                      cy="26"
                      rx="30"
                      ry="12"
                      fill="none"
                      stroke="#e5bd73"
                      strokeWidth="3"
                    />
                  )}
                  {a.walking && a.transport && a.transport !== "walk" ? (
                    <g transform="translate(0 2)">
                      <TransportModel kind={a.transport} color={color} />
                    </g>
                  ) : (
                    <g transform={person ? "scale(.75)" : "scale(.6)"}>
                      <BlockCharacter
                        appearance={
                          world.living?.appearances?.[a.id] ??
                          defaultAppearance(
                            a.id,
                            person?.role ??
                              `${npc?.roleId ?? ""} ${world.living?.catalog.roles.find((r) => r.id === npc?.roleId)?.label ?? ""}`,
                          )
                        }
                        walking={a.walking}
                        speaking={speech?.speaker === a.id}
                        paused={world.paused}
                      />
                    </g>
                  )}
                  {(selected === a.id || person) && (
                    <text
                      y={person ? -62 : -47}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="600"
                      fill="#476152"
                      stroke="#edf0df"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {a.name}
                    </text>
                  )}
                  {speech?.speaker === a.id && (
                    <foreignObject x="-112" y="-123" width="224" height="80">
                      <div className="live-speech">{speech.text}</div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
            {wt.daylight < 0.5 && (
              <rect
                x={vx}
                y={vy}
                width={vw}
                height={vh}
                fill="#263a51"
                opacity={(1 - wt.daylight) * 0.22}
                pointerEvents="none"
              />
            )}
          </>
        )}
      </svg>
      {mode === "city" && (
        <div className="live-hud live-person">
          <span className="person-indicator" />
          <button onClick={onInspect}>
            <b>{current?.name ?? "An"}</b>
            <small>{current?.activity ?? "Đang sinh hoạt"}</small>
          </button>
          <span className="live-person-count">
            {world.people.length + (world.living?.residents.length ?? 0)} cư dân
          </span>
        </div>
      )}
      <div className="urban-camera" aria-label="Điều khiển bản đồ">
        <button
          aria-label="Phóng to"
          onClick={() => setZoom((z) => Math.min(4, z * 1.25))}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Thu nhỏ"
          onClick={() => setZoom((z) => Math.max(0.18, z / 1.25))}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="Theo nhân vật"
          aria-pressed={following}
          onClick={() => {
            setFollowing(true);
            setZoom(1.45);
          }}
        >
          <LocateFixed size={17} />
        </button>
        <button
          aria-label="Toàn cảnh thành phố"
          onClick={() => {
            setFollowing(false);
            setZoom(Math.min(0.65, (1000 * aspect) / 2500));
            setCenter([1200, 750]);
          }}
        >
          <Scan size={17} />
        </button>
      </div>
      <div className="map-credit">
        {mode === "osm" ? (
          <>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              © OpenStreetMap contributors
            </a>{" "}
            · ODbL · Khảo sát trung tâm TP.HCM
          </>
        ) : (
          "Không gian & phương tiện mô phỏng · Kéo để di chuyển · Cuộn để zoom"
        )}
      </div>
    </div>
  );
}
