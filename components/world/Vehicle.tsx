import type { Vehicle as VehicleState } from '@/lib/traffic';

export function Vehicle({ vehicle }: { vehicle: VehicleState }) {
  const bus = vehicle.kind === 'bus';
  const length = bus ? 65 : vehicle.kind === 'van' ? 49 : 43;

  return (
    <g
      data-vehicle={vehicle.id}
      data-waiting={vehicle.waiting}
      transform={`translate(${vehicle.position[0]} ${vehicle.position[1]}) rotate(${vehicle.angle})`}
      className={vehicle.moving ? 'vehicle-moving' : 'vehicle-idle'}
    >
      <ellipse cy="4" rx={length / 2 + 4} ry="14" fill="#46675d" opacity=".15" />
      <rect
        x={-length / 2 + 5}
        y="-15"
        width="10"
        height="6"
        rx="2"
        fill="#52656a"
      />
      <rect
        x={-length / 2 + 5}
        y="9"
        width="10"
        height="6"
        rx="2"
        fill="#52656a"
      />
      <rect
        x={length / 2 - 15}
        y="-15"
        width="10"
        height="6"
        rx="2"
        fill="#52656a"
      />
      <rect
        x={length / 2 - 15}
        y="9"
        width="10"
        height="6"
        rx="2"
        fill="#52656a"
      />
      <rect
        x={-length / 2}
        y="-12"
        width={length}
        height="24"
        rx={bus ? 5 : 9}
        fill={vehicle.color}
        stroke="#f8f4df"
        strokeWidth="1.5"
      />
      <path d={`M${length / 2 - 13} -9l6 2v14l-6 2Z`} fill="#60818b" />
      {bus ? (
        [0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={-length / 2 + 5 + i * 9}
            y="-8"
            width="6"
            height="16"
            rx="1"
            fill="#93b7bc"
          />
        ))
      ) : (
        <rect x="-10" y="-9" width="17" height="18" rx="4" fill="#cfddd4" />
      )}
      <path
        d={`M${length / 2} -8v4m0 8v4`}
        stroke="#fff4b2"
        strokeWidth="3"
      />
      <path
        d={`M${-length / 2} -8v3m0 10v3`}
        stroke="#bd7868"
        strokeWidth="2"
      />
    </g>
  );
}
