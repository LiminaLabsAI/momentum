import React, { useState, useEffect, useCallback } from "react";

/**
 * MomentumLogo — the "fast-forward" chevron mark.
 *
 * Behavior (the recommended default): a single forward sweep on mount,
 * and a one-shot sweep on hover. It does NOT loop. Honors
 * prefers-reduced-motion (renders static). Pass `loop` for a continuous
 * sweep — only for loading / "agent working" states.
 *
 *   <MomentumLogo />                        // mark, 28px, cobalt
 *   <MomentumLogo wordmark />               // mark + "momentum" lockup
 *   <MomentumLogo size={40} color="#fff" /> // white, e.g. on dark
 *   <MomentumLogo loop />                   // continuous (loading state)
 */
export function MomentumLogo({
  size = 28,
  wordmark = false,
  color = "#0023AE",      // brand cobalt
  inkColor = "#15161C",   // wordmark ink
  loop = false,
  className,
  style,
  ...rest
}) {
  // `runId` remounts the paths to replay the one-shot animation.
  const [runId, setRunId] = useState(0);
  useEffect(() => { setRunId((n) => n + 1); }, []); // play once on mount
  const replay = useCallback(() => { if (!loop) setRunId((n) => n + 1); }, [loop]);

  const vb = wordmark ? "0 0 212 48" : "0 0 48 48";
  const h = size;
  const w = wordmark ? size * (212 / 48) : size;
  const anim = loop
    ? "mm-flow 1.5s ease-in-out infinite"
    : "mm-in .55s cubic-bezier(.2,.7,.2,1) both";

  const chevron = (cls, d, delay, base) => (
    <path
      key={`${cls}-${runId}`}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        ["--b"]: base,
        transformBox: "fill-box",
        transformOrigin: "center",
        opacity: base,
        animation: anim,
        animationDelay: `${delay}s`,
      }}
    />
  );

  return (
    <span
      onMouseEnter={replay}
      className={className}
      style={{ display: "inline-flex", alignItems: "center", lineHeight: 0, ...style }}
      {...rest}
    >
      <style>{`
        @keyframes mm-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: var(--b); transform: none; } }
        @keyframes mm-flow { 0%,100% { opacity: var(--b); transform: translateX(-1px);} 50% { opacity: 1; transform: translateX(1px);} }
        @media (prefers-reduced-motion: reduce) {
          .mm-logo path { animation: none !important; opacity: var(--b) !important; transform: none !important; }
        }
      `}</style>
      <svg className="mm-logo" width={w} height={h} viewBox={vb} fill="none" role="img" aria-label="momentum">
        {chevron("m1", "M11 15 20 24 11 33", 0.0, 0.3)}
        {chevron("m2", "M20 15 29 24 20 33", 0.09, 0.6)}
        {chevron("m3", "M29 15 38 24 29 33", 0.18, 1)}
        {wordmark && (
          <text x="52" y="32" fontFamily="Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
                fontSize="29" fontWeight="600" letterSpacing="-1.2" fill={inkColor}>momentum</text>
        )}
      </svg>
    </span>
  );
}

export default MomentumLogo;
