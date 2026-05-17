"use client";

import type { FlatStep } from "./guide-config";
import { getGuideConfig } from "./guide-config";
import { useCallback, useEffect, useState } from "react";

const SOCAR_BLUE = "#0086F6";
const DISPLAY_MS = 2400;
const EXIT_MS = 280;

interface CaptureGuideOverlayProps {
  stepIndex: number;
  step: FlatStep;
  viewNumber: number;
  onDismiss?: () => void;
}

export function CaptureGuideOverlay({
  stepIndex,
  step,
  viewNumber,
  onDismiss,
}: CaptureGuideOverlayProps) {
  const config = getGuideConfig(stepIndex, step, viewNumber);
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, EXIT_MS);
  }, [leaving, onDismiss]);

  useEffect(() => {
    setVisible(true);
    setLeaving(false);
    const exitAt = window.setTimeout(() => setLeaving(true), DISPLAY_MS);
    const hideAt = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, DISPLAY_MS + EXIT_MS);
    return () => {
      window.clearTimeout(exitAt);
      window.clearTimeout(hideAt);
    };
  }, [stepIndex, onDismiss]);

  if (!visible || !config) return null;

  const angleDeg = parseInt(step.angle, 10) || 0;

  return (
    <div
      className={`capture-guide-overlay ${leaving ? "capture-guide-overlay--out" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-guide-title"
      onClick={dismiss}
      onKeyDown={(e) => e.key === "Escape" && dismiss()}
    >
      <div
        className={`capture-guide-card ${leaving ? "capture-guide-card--out" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GuideVisual variant={config.variant} angleDeg={angleDeg} viewNumber={viewNumber} />

        <p id="capture-guide-title" className="mt-5 text-center text-lg font-bold text-ink">
          {config.title}
        </p>
        <p className="mt-2 text-center text-sm leading-relaxed text-body">{config.body}</p>

        {config.hint && (
          <p className="mt-3 text-center text-xs font-medium text-foggy">{config.hint}</p>
        )}

        <div className="capture-guide-progress mt-5 h-1 overflow-hidden rounded-full bg-surface-strong">
          <span
            className="capture-guide-progress-bar block h-full rounded-full"
            style={{ backgroundColor: SOCAR_BLUE }}
          />
        </div>

        <button
          type="button"
          className="mt-4 w-full py-2 text-sm font-medium text-foggy transition hover:text-ink"
          onClick={dismiss}
        >
          탭하여 닫기
        </button>
      </div>
    </div>
  );
}

function GuideVisual({
  variant,
  angleDeg,
  viewNumber,
}: {
  variant: "welcome" | "newView" | "rotate" | "flash";
  angleDeg: number;
  viewNumber: number;
}) {
  if (variant === "welcome") {
    return (
      <div className="capture-guide-visual mx-auto flex h-28 w-28 items-center justify-center">
        <span
          className="capture-guide-pulse absolute h-24 w-24 rounded-full opacity-30"
          style={{ backgroundColor: SOCAR_BLUE }}
        />
        <span className="relative text-5xl" aria-hidden>
          📱
        </span>
        <span
          className="capture-guide-flash absolute -right-1 -top-1 flex h-10 w-10 items-center justify-center rounded-full text-lg text-white shadow-md"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          ⚡
        </span>
      </div>
    );
  }

  if (variant === "newView") {
    return (
      <div className="capture-guide-visual relative mx-auto h-28 w-28">
        <span className="capture-guide-orbit absolute inset-2 rounded-full border-2 border-dashed border-hairline" />
        <span
          className="capture-guide-orbit-dot absolute left-1/2 top-0 -ml-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          {viewNumber}
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-hidden>
          🔄
        </span>
      </div>
    );
  }

  return (
    <div className="capture-guide-visual relative mx-auto h-28 w-28">
      <span
        className="capture-guide-polarizer absolute inset-3 rounded-full border-[3px] border-hairline bg-surface-soft"
        aria-hidden
      />
      <span
        className="capture-guide-polarizer-line absolute left-1/2 top-1/2 h-[38%] w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
        style={{ "--guide-angle": `${angleDeg}deg` } as React.CSSProperties}
        aria-hidden
      />
      <span
        className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
        style={{ color: SOCAR_BLUE }}
      >
        {angleDeg}°
      </span>
    </div>
  );
}
