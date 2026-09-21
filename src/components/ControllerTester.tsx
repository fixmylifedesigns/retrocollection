"use client";

import { padName, rumble, useGamepads, type PadState } from "@/hooks/useGamepads";

const ON = "#5b45c8";

function PadDiagram({ pad }: { pad: PadState }) {
  const b = (i: number) => pad.buttons[i] ?? 0;
  const fill = (i: number) => (b(i) > 0.5 ? ON : "#fff");
  const standard = pad.mapping === "standard";

  const stick = (cx: number, cy: number, ax: number, ay: number, press: number) => (
    <g>
      <circle cx={cx} cy={cy} r={28} fill="#e3e5ea" stroke="#1c1f2e" strokeWidth={2} />
      <circle
        cx={cx + (pad.axes[ax] ?? 0) * 14}
        cy={cy + (pad.axes[ay] ?? 0) * 14}
        r={15}
        fill={fill(press)}
        stroke="#1c1f2e"
        strokeWidth={2}
      />
    </g>
  );

  const trigger = (x: number, i: number) => (
    <g>
      <rect x={x} y={8} width={70} height={10} rx={5} fill="#fff" stroke="#1c1f2e" strokeWidth={2} />
      <rect x={x} y={8} width={70 * b(i)} height={10} rx={5} fill={ON} />
    </g>
  );

  return (
    <svg viewBox="0 0 480 290" className="w-full max-w-xl" role="img" aria-label={`Live input from ${padName(pad.id)}`}>
      {trigger(95, 6)}
      {trigger(315, 7)}
      <rect x={85} y={28} width={90} height={16} rx={8} fill={fill(4)} stroke="#1c1f2e" strokeWidth={2} />
      <rect x={305} y={28} width={90} height={16} rx={8} fill={fill(5)} stroke="#1c1f2e" strokeWidth={2} />
      <path
        d="M110 52 H370 C440 52 470 120 470 200 C470 262 430 280 400 268 L340 236 H140 L80 268 C50 280 10 262 10 200 C10 120 40 52 110 52 Z"
        fill="#d4d6dd"
        stroke="#1c1f2e"
        strokeWidth={2}
      />
      {/* D-pad */}
      <rect x={106} y={96} width={28} height={28} rx={4} fill={fill(12)} stroke="#1c1f2e" strokeWidth={2} />
      <rect x={106} y={152} width={28} height={28} rx={4} fill={fill(13)} stroke="#1c1f2e" strokeWidth={2} />
      <rect x={78} y={124} width={28} height={28} rx={4} fill={fill(14)} stroke="#1c1f2e" strokeWidth={2} />
      <rect x={134} y={124} width={28} height={28} rx={4} fill={fill(15)} stroke="#1c1f2e" strokeWidth={2} />
      {/* Face buttons */}
      <circle cx={360} cy={168} r={16} fill={fill(0)} stroke="#1c1f2e" strokeWidth={2} />
      <circle cx={392} cy={138} r={16} fill={fill(1)} stroke="#1c1f2e" strokeWidth={2} />
      <circle cx={328} cy={138} r={16} fill={fill(2)} stroke="#1c1f2e" strokeWidth={2} />
      <circle cx={360} cy={108} r={16} fill={fill(3)} stroke="#1c1f2e" strokeWidth={2} />
      {/* Select / start / home */}
      <rect x={196} y={110} width={30} height={12} rx={6} fill={fill(8)} stroke="#1c1f2e" strokeWidth={2} />
      <rect x={254} y={110} width={30} height={12} rx={6} fill={fill(9)} stroke="#1c1f2e" strokeWidth={2} />
      <circle cx={240} cy={150} r={11} fill={fill(16)} stroke="#1c1f2e" strokeWidth={2} />
      {stick(185, 210, 0, 1, 10)}
      {stick(295, 210, 2, 3, 11)}
      {!standard && (
        <text x={240} y={284} textAnchor="middle" fontSize={12} fill="#5d6174">
          Non-standard layout: buttons may light up in different places
        </text>
      )}
    </svg>
  );
}

export default function ControllerTester() {
  const pads = useGamepads(true);

  if (pads.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border-2 border-dashed border-line bg-white/50 px-6 py-14 text-center">
        <p className="text-lg font-semibold">Waiting for a controller</p>
        <p className="mt-2 text-muted">Pair it using the steps below, then press any button. Browsers only reveal a controller after a button press.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-10">
      {pads.map((pad) => (
        <div key={pad.index} className="grid items-center gap-6 md:grid-cols-[1fr_16rem]">
          <PadDiagram pad={pad} />
          <div>
            <p className="text-lg font-semibold">{padName(pad.id)}</p>
            <p className="text-sm text-muted">Player {pad.index + 1}</p>
            <p className="mt-3 break-all text-xs text-muted">{pad.id}</p>
            {pad.canRumble && (
              <button
                type="button"
                onClick={() => rumble(pad.index)}
                className="mt-4 rounded-full border border-line px-4 py-2 text-sm hover:bg-plastic"
              >
                Test rumble
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
