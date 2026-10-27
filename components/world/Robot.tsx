import { useId } from 'react';
import type { Person } from '@/lib/world';

export type RobotMotion =
  | 'idle'
  | 'walk'
  | 'work'
  | 'garden'
  | 'read'
  | 'social'
  | 'eat'
  | 'rest'
  | 'play';

export function robotMotion(kind: import('@/lib/life').Step['kind']): RobotMotion {
  if (kind === 'study') return 'read';
  if (kind === 'drink' || kind === 'shop') return 'eat';
  if (kind === 'run' || kind === 'walk-pet') return 'walk';
  if (['jump','tag','cycle','exercise'].includes(kind)) return 'play';
  return kind as RobotMotion;
}

export function Robot({
  person,
  portrait = false,
  motion = 'idle',
  speaking = false,
  paused = false,
}: {
  person: Person;
  portrait?: boolean;
  motion?: RobotMotion;
  speaking?: boolean;
  paused?: boolean;
}) {
  const an = person.id === 'an';
  const chi = person.id === 'chi';
  const uid = useId().replaceAll(':', '');
  const c = person.color;
  const light = an ? '#ffd28f' : chi ? '#b5e9a0' : '#a3ddf5';

  return (
    <g
      className={`robot-rig robot-${person.id} motion-${portrait ? 'idle' : motion} ${speaking ? 'is-speaking' : ''} ${paused ? 'motion-paused' : ''}`}
      data-motion={motion}
    >
      <defs>
        <linearGradient id={uid + 'shell'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor={chi ? '#f0f3df' : '#edf1ed'} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <linearGradient id={uid + 'metal'} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e1ebe6" />
          <stop offset=".5" stopColor="#8ca3a4" />
          <stop offset="1" stopColor="#c6d8d2" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="46" rx="25" ry="8" fill="#34534b" opacity=".14" />
      <g className="robot-leg robot-leg-left">
        <circle cx="-10" cy="26" r="5" fill="#52636a" />
        <path d="M-10 28v12" stroke="#7e9497" strokeWidth="7" />
        <circle cx="-10" cy="37" r="3" fill="#d3ded5" />
        <rect x="-18" y="40" width="16" height="7" rx="3" fill={c} />
        <path d="M-16 45h11" stroke="#52636a" strokeWidth="2" />
      </g>
      <g className="robot-leg robot-leg-right">
        <circle cx="10" cy="26" r="5" fill="#52636a" />
        <path d="M10 28v12" stroke="#7e9497" strokeWidth="7" />
        <circle cx="10" cy="37" r="3" fill="#d3ded5" />
        <rect x="3" y="40" width="17" height="7" rx="3" fill={c} />
        <path d="M5 45h12" stroke="#52636a" strokeWidth="2" />
      </g>
      <g className="robot-torso">
        <rect x="-23" y="3" width="12" height="22" rx="4" fill="#6c8382" />
        {chi && (
          <path
            d="M-24 2q-17 -22 -1-24q12 7 1 24"
            fill="#83ab7e"
            stroke="#5f8b70"
            strokeWidth="1.5"
          />
        )}
        <path
          d={
            chi
              ? 'M-13 -3Q0 -10 14 -3Q25 8 23 25Q0 44 -23 25Q-25 8 -13 -3Z'
              : an
                ? 'M-21 0L14 -3L24 20L10 31L-21 27Z'
                : 'M-14 -1Q0 -7 15 -1L17 29H-17Z'
          }
          fill={chi ? `url(#${uid}shell)` : c}
          stroke="#f9f3df"
          strokeWidth="2"
        />
        <path d="M-12 5h25" stroke="#ffffff" opacity=".35" strokeWidth="3" />
        <rect
          x={an ? -12 : -10}
          y={chi ? 13 : 8}
          width={chi ? 20 : an ? 25 : 20}
          height={chi ? 16 : an ? 14 : 19}
          rx={chi ? 9 : 3}
          fill="#edf3e7"
          stroke="#b3c6ba"
          strokeWidth="1"
        />
        <rect
          x="-7"
          y={chi ? 17 : 11}
          width="15"
          height={chi ? 8 : an ? 7 : 13}
          rx="2"
          fill="#435d64"
        />
        {an ? (
          <path d="M1 11l-5 6h5l-1 4 7-7H2Z" fill={light} />
        ) : chi ? (
          <path
            d="M0 20q-11-10 0-9q10-2 0 9m0-7v8"
            fill="#98c57e"
            stroke="#7ca46c"
          />
        ) : (
          <path d="M-5 15h3m3 0h5m-11 3h12" stroke={light} strokeWidth="1.5" />
        )}
        {an && (
          <>
            <path d="M-17 21h34v8h-34Z" fill="#657c7b" />
            <rect x="8" y="21" width="8" height="12" rx="2" fill="#b6d0c3" />
            <path d="M-15 24h10" stroke="#d2b188" strokeWidth="2" />
          </>
        )}
        {!an && !chi && (
          <>
            <path d="M-8 16h3m3 0h4m-10 5h12" stroke="#a3ddf5" strokeWidth="1" />
            <circle cx="21" cy="16" r="5" fill="#c0d5df" />
            <circle cx="21" cy="16" r="2" fill="#648699" />
          </>
        )}
        <circle cx="-12" cy="25" r="1.5" fill="#f6edcc" />
        <circle cx="12" cy="25" r="1.5" fill="#f6edcc" />
        <g className="robot-arm robot-arm-left">
          <circle
            cx="-20"
            cy="7"
            r="5"
            fill="#dbe5dc"
            stroke="#718887"
            strokeWidth="2"
          />
          <path
            d="M-22 9L-27 20"
            stroke={chi ? '#c7d9b8' : c}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="-27" cy="20" r="3.5" fill="#718887" />
          <path
            d="M-27 20l-1 9"
            stroke="#c3d4cf"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {chi ? (
            <ellipse
              cx="-28"
              cy="32"
              rx="6"
              ry="7"
              fill="#a8c396"
              stroke="#f1f4e2"
            />
          ) : (
            <path
              d="M-32 29v5l4 2 4-3v-4"
              fill="none"
              stroke={c}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </g>
        <g className="robot-arm robot-arm-right">
          <circle
            cx="20"
            cy="7"
            r="5"
            fill="#dbe5dc"
            stroke="#718887"
            strokeWidth="2"
          />
          <path
            d="M22 9l5 11"
            stroke={chi ? '#c7d9b8' : c}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="27" cy="20" r="3.5" fill="#718887" />
          <path
            d="M27 20l1 9"
            stroke="#c3d4cf"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {chi ? (
            <ellipse
              cx="28"
              cy="32"
              rx="6"
              ry="7"
              fill="#a8c396"
              stroke="#f1f4e2"
            />
          ) : (
            <path
              d="M24 29v5l4 2 4-3v-4"
              fill="none"
              stroke={c}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}
        </g>
      </g>
      <g className="robot-head">
        <path d="M-6 0v-8h12v8" fill="#809696" />
        <path d="M0 -44v-10" stroke="#70878a" strokeWidth="3" />
        {chi ? (
          <path
            d="M0-48q-14-15-17-4q3 9 17 4m0 0q14-19 20-7q-4 12-20 7"
            fill="#8db783"
            stroke="#6e9a79"
            strokeWidth="1"
          />
        ) : (
          <>
            <circle cy="-57" r="4" fill={light} stroke={c} strokeWidth="2" />
            {an && (
              <path
                d="M-7-56l-6-4m20 4 6-4"
                stroke="#dfbb8d"
                strokeWidth="2"
              />
            )}
          </>
        )}
        <path
          d={
            chi
              ? 'M-27-30Q-28-50 0-49Q28-50 28-26Q26-3 0-1Q-27-2-27-30Z'
              : an
                ? 'M-32-35L-19-44H16L32-31L26-7H-27Z'
                : 'M-18-48Q0-56 18-48L23-38V-8L12-1H-16L-24-10V-37Z'
          }
          fill={`url(#${uid}shell)`}
          stroke={c}
          strokeWidth="3"
        />
        <path d="M-22-36h37" stroke="#fff" strokeWidth="2" opacity=".7" />
        {an ? (
          <>
            <path
              d="M-26-32L-13-36L-2-29V-15L-14-10L-26-17Z"
              fill="#425b65"
              stroke="#9fbcba"
              strokeWidth="2"
            />
            <path
              d="M2-29L14-36L27-31V-16L14-10L2-15Z"
              fill="#425b65"
              stroke="#9fbcba"
              strokeWidth="2"
            />
            <path d="M-2-24h4" stroke="#6a8786" strokeWidth="3" />
            <g className="robot-eyes">
              <ellipse cx="-14" cy="-23" rx="7" ry="8" fill="#ffc78a" />
              <ellipse cx="14" cy="-23" rx="7" ry="8" fill="#ffc78a" />
              <ellipse cx="-13" cy="-23" rx="3" ry="5" fill="#45606a" />
              <ellipse cx="15" cy="-23" rx="3" ry="5" fill="#45606a" />
              <circle cx="-15" cy="-26" r="2" fill="#fff7db" />
              <circle cx="13" cy="-26" r="2" fill="#fff7db" />
            </g>
          </>
        ) : chi ? (
          <>
            <path
              d="M-22-30Q0-44 22-30L20-16Q0-6-20-16Z"
              fill="#486a60"
            />
            <g className="robot-eyes">
              <path
                d="M-15-22q4-7 8 0m14 0q4-7 8 0"
                fill="none"
                stroke="#d0eca8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
            <ellipse cx="-17" cy="-15" rx="3" ry="1.5" fill="#d8ae94" />
            <ellipse cx="17" cy="-15" rx="3" ry="1.5" fill="#d8ae94" />
          </>
        ) : (
          <>
            <rect x="-17" y="-42" width="34" height="34" rx="15" fill="#3a5268" />
            <circle
              cy="-26"
              r="14"
              fill="#6d90a4"
              stroke="#a7c8d8"
              strokeWidth="1.5"
            />
            <g className="robot-eyes">
              <circle cy="-26" r="9" fill="#9bd5e8" />
              <circle cy="-26" r="5" fill="#334d65" />
              <circle cx="-3" cy="-30" r="3" fill="#e1f7f0" />
            </g>
            <path
              d="M-13-6h4m3 0h3m3 0h3m3 0h4"
              stroke="#869eac"
              strokeWidth="2"
            />
          </>
        )}
        <g className="robot-mouth">
          <path
            d={chi ? 'M-4-14q4 4 8 0' : 'M-4-14h8'}
            stroke={light}
            strokeWidth="1.7"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        <rect x="-34" y="-30" width="6" height="15" rx="2" fill={c} />
        <rect x="29" y="-30" width="6" height="15" rx="2" fill={c} />
        <circle cx="-31" cy="-23" r="1.5" fill={light} />
        <path
          d="M-17-5h8m17 0h8"
          stroke="#829a97"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {an && (
          <path
            d="M-16-44l4-7h23l6 7"
            fill="#dbb189"
            stroke="#c89970"
            strokeWidth="1"
          />
        )}
      </g>
    </g>
  );
}

export function Avatar({
  person,
  size = 46,
}: {
  person: Person;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 110"
      role="img"
      aria-label={`Robot AI ${person.name}`}
    >
      <rect width="90" height="110" rx="26" fill={person.color + '25'} />
      <g transform="translate(45 61) scale(.85)">
        <Robot person={person} portrait />
      </g>
    </svg>
  );
}
