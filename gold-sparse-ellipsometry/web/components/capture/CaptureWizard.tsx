"use client";

import { fileToResizedDataUrl } from "@/lib/client-image";
import type { FlashIntensity, MeasurementResult, PolChannel, UploadViewPayload } from "@/lib/types";
import { POL_CHANNELS } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResultCard } from "../ResultCard";
import { Button } from "../ui/Button";
import { CaptureGuideOverlay } from "./CaptureGuideOverlay";
import type { FlatStep } from "./guide-config";

const MIN_VIEWS = 4;
const SOCAR_BLUE = "#0086F6";
const SOCAR_NAVY = "#0B1F35";

type ChannelPreview = Partial<Record<PolChannel, string>>;

interface ViewSlot {
  viewIndex: number;
  flashIntensity: FlashIntensity;
  previews: ChannelPreview;
}

type Phase = "prep" | "shoot" | "confirm" | "relocate" | "finish";

function buildSteps(viewCount: number): FlatStep[] {
  const steps: FlatStep[] = [];
  for (let v = 0; v < viewCount; v++) {
    for (const c of POL_CHANNELS) {
      steps.push({
        viewIndex: v,
        channel: c.key,
        angle: c.angle,
        label: c.label,
      });
    }
  }
  return steps;
}

function emptyViews(count: number): ViewSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    viewIndex: i,
    flashIntensity: "quarter" as FlashIntensity,
    previews: {},
  }));
}

export function CaptureWizard() {
  const [viewCount, setViewCount] = useState(MIN_VIEWS);
  const [views, setViews] = useState<ViewSlot[]>(() => emptyViews(MIN_VIEWS));
  const [phase, setPhase] = useState<Phase>("prep");
  const [stepIndex, setStepIndex] = useState(0);
  const [confirmPreview, setConfirmPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = useMemo(() => buildSteps(viewCount), [viewCount]);
  const current = steps[stepIndex];
  const progress = phase === "prep" ? 0 : Math.round(((stepIndex + (phase === "confirm" ? 0.5 : 1)) / steps.length) * 100);

  const clearAdvanceTimer = () => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  useEffect(() => () => clearAdvanceTimer(), []);

  const goNextAfterCapture = useCallback(() => {
    const completedViewEnd = (stepIndex + 1) % 4 === 0;
    const isLast = stepIndex >= steps.length - 1;

    if (isLast) {
      setPhase("finish");
      setConfirmPreview(null);
      return;
    }
    if (completedViewEnd) {
      setPhase("relocate");
      setConfirmPreview(null);
      return;
    }
    setStepIndex((i) => i + 1);
    setPhase("shoot");
    setConfirmPreview(null);
  }, [stepIndex, steps.length]);

  useEffect(() => {
    if (phase !== "confirm" || !confirmPreview) return;
    clearAdvanceTimer();
    advanceTimer.current = setTimeout(() => goNextAfterCapture(), 900);
    return clearAdvanceTimer;
  }, [phase, confirmPreview, goNextAfterCapture]);

  const setFlashForView = (viewIndex: number, flash: FlashIntensity) => {
    setViews((prev) => prev.map((v) => (v.viewIndex === viewIndex ? { ...v, flashIntensity: flash } : v)));
  };

  const onFile = async (file: File | null) => {
    if (!file || !current) return;
    setError(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setViews((prev) =>
        prev.map((v) =>
          v.viewIndex === current.viewIndex
            ? { ...v, previews: { ...v.previews, [current.channel]: dataUrl } }
            : v,
        ),
      );
      setConfirmPreview(dataUrl);
      setPhase("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 처리 실패");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const retake = () => {
    clearAdvanceTimer();
    if (!current) return;
    setViews((prev) =>
      prev.map((v) => {
        if (v.viewIndex !== current.viewIndex) return v;
        const next = { ...v.previews };
        delete next[current.channel];
        return { ...v, previews: next };
      }),
    );
    setConfirmPreview(null);
    setPhase("shoot");
  };

  const goBack = () => {
    clearAdvanceTimer();
    setConfirmPreview(null);
    if (phase === "relocate") {
      setStepIndex((i) => Math.max(0, i - 1));
      setPhase("shoot");
      return;
    }
    if (phase === "shoot" || phase === "confirm") {
      if (stepIndex === 0) {
        setPhase("prep");
        setStepIndex(0);
        return;
      }
      const prev = stepIndex - 1;
      if (prev > 0 && prev % 4 === 3) {
        setPhase("relocate");
        setStepIndex(prev);
        return;
      }
      setStepIndex(prev);
      setPhase("shoot");
    }
  };

  const startCapture = () => {
    setStepIndex(0);
    setPhase("shoot");
    setResult(null);
    setError(null);
  };

  const continueAfterRelocate = () => {
    setStepIndex((i) => i + 1);
    setPhase("shoot");
  };

  const addView = () => {
    const nextStep = viewCount * 4;
    setViewCount((n) => n + 1);
    setViews((prev) => [
      ...prev,
      { viewIndex: prev.length, flashIntensity: "quarter", previews: {} },
    ]);
    setStepIndex(nextStep);
    setPhase("shoot");
    setResult(null);
  };

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payloads: UploadViewPayload[] = [];
      for (const v of views) {
        const channels = {} as Record<PolChannel, string>;
        for (const c of POL_CHANNELS) {
          const url = v.previews[c.key];
          if (!url) throw new Error(`각도 ${v.viewIndex + 1}: 편광 ${c.angle} 사진이 필요합니다.`);
          channels[c.key] = url;
        }
        payloads.push({
          viewIndex: v.viewIndex,
          flashIntensity: v.flashIntensity,
          channels,
        });
      }
      const res = await fetch("/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "upload", views: payloads }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setResult(data as MeasurementResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "측정 실패");
    } finally {
      setLoading(false);
    }
  }, [views]);

  const resetAll = () => {
    clearAdvanceTimer();
    setViewCount(MIN_VIEWS);
    setViews(emptyViews(MIN_VIEWS));
    setStepIndex(0);
    setPhase("prep");
    setConfirmPreview(null);
    setResult(null);
    setError(null);
  };

  const shotNumber = stepIndex + 1;
  const viewNumber = current ? current.viewIndex + 1 : 1;

  return (
    <div className="relative overflow-hidden rounded-airbnb border border-hairline bg-canvas shadow-airbnb">
      <div className="text-white" style={{ backgroundColor: SOCAR_NAVY }}>
        <div className="flex h-12 items-center px-4">
          {phase !== "prep" && phase !== "finish" && !result && (
            <button
              type="button"
              onClick={goBack}
              className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-white/90 hover:bg-white/10"
              aria-label="이전"
            >
              ←
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {phase === "prep"
                ? "촬영 준비"
                : phase === "finish"
                  ? "촬영 완료"
                  : phase === "relocate"
                    ? `위치 ${viewNumber} 완료`
                    : `촬영 ${shotNumber} / ${steps.length}`}
            </p>
            {phase !== "prep" && phase !== "finish" && (
              <p className="truncate text-xs text-white/70">
                {phase === "relocate"
                  ? "다음 위치로 이동하세요"
                  : current
                    ? `각도 ${viewNumber} · 편광 ${current.angle}`
                    : ""}
              </p>
            )}
          </div>
          {phase !== "prep" && !result && (
            <span className="ml-2 shrink-0 text-xs font-medium text-white/80">{progress}%</span>
          )}
        </div>
        <div className="h-1 bg-white/20">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: SOCAR_BLUE }}
          />
        </div>
      </div>

      <div className="flex min-h-[420px] flex-col px-5 py-6 sm:min-h-[480px]">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />

        {phase === "prep" && (
          <PrepScreen
            flash={views[0]?.flashIntensity ?? "quarter"}
            onFlash={(f) => setFlashForView(0, f)}
            onStart={startCapture}
          />
        )}

        {phase === "shoot" && current && (
          <ShootScreen
            step={current}
            viewNumber={viewNumber}
            flash={views[current.viewIndex]?.flashIntensity ?? "quarter"}
            onFlash={(f) => setFlashForView(current.viewIndex, f)}
            onCapture={() => fileRef.current?.click()}
          />
        )}

        {phase === "confirm" && confirmPreview && current && (
          <ConfirmScreen preview={confirmPreview} angle={current.angle} onRetake={retake} onNext={goNextAfterCapture} />
        )}

        {phase === "relocate" && (
          <RelocateScreen viewNumber={viewNumber} totalViews={viewCount} onContinue={continueAfterRelocate} />
        )}

        {phase === "finish" && !result && (
          <FinishScreen
            viewCount={viewCount}
            loading={loading}
            onMeasure={run}
            onAddView={addView}
            onRestart={resetAll}
          />
        )}

        {error && (
          <p className="mt-4 rounded-airbnb-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-2 space-y-4">
            <ResultCard result={result} />
            <Button variant="secondary" className="w-full" onClick={resetAll}>
              처음부터 다시 촬영
            </Button>
          </div>
        )}
      </div>

      {phase === "shoot" && current && (
        <CaptureGuideOverlay
          key={`guide-${stepIndex}`}
          stepIndex={stepIndex}
          step={current}
          viewNumber={viewNumber}
        />
      )}
    </div>
  );
}

function PrepScreen({
  flash,
  onFlash,
  onStart,
}: {
  flash: FlashIntensity;
  onFlash: (f: FlashIntensity) => void;
  onStart: () => void;
}) {
  return (
    <>
      <div className="flex-1">
        <h2 className="text-xl font-bold text-ink">촬영 전 확인</h2>
        <p className="mt-2 text-sm leading-relaxed text-body">
          한 장 찍으면 바로 다음 단계로 넘어갑니다. 총 {MIN_VIEWS}개 위치 × 편광 4장입니다.
        </p>
        <ul className="mt-6 space-y-4">
          {[
            { n: "1", t: "플래시 ON · 어두운 배경 · 시편 고정" },
            { n: "2", t: "편광 필터 각도마다 1장씩 순서대로 촬영" },
            { n: "3", t: "위치마다 시편 주위로 이동 후 반복" },
          ].map((item) => (
            <li key={item.n} className="flex gap-3 text-sm text-body">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: SOCAR_BLUE }}
              >
                {item.n}
              </span>
              {item.t}
            </li>
          ))}
        </ul>
        <label className="mt-8 block text-sm font-medium text-ink">
          플래시 밝기 (기록용)
          <select
            value={flash}
            onChange={(e) => onFlash(e.target.value as FlashIntensity)}
            className="mt-2 h-12 w-full rounded-airbnb-sm border border-hairline bg-surface-soft px-4 text-base"
          >
            <option value="quarter">플래시 1/4</option>
            <option value="eighth">플래시 1/8</option>
            <option value="sixteenth">플래시 1/16</option>
          </select>
        </label>
      </div>
      <WizardFooter>
        <button
          type="button"
          onClick={onStart}
          className="h-14 w-full rounded-airbnb-sm text-base font-semibold text-white transition active:scale-[0.98]"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          촬영 시작
        </button>
      </WizardFooter>
    </>
  );
}

function ShootScreen({
  step,
  viewNumber,
  flash,
  onFlash,
  onCapture,
}: {
  step: FlatStep;
  viewNumber: number;
  flash: FlashIntensity;
  onFlash: (f: FlashIntensity) => void;
  onCapture: () => void;
}) {
  const isFirstInView = POL_CHANNELS[0].key === step.channel;

  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-4 inline-flex rounded-pill px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          위치 {viewNumber}
        </span>
        <p className="text-[13px] font-medium uppercase tracking-wider text-foggy">편광 각도</p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-ink">{step.angle}</p>
        <p className="mt-2 text-lg text-body">{step.label} 채널 촬영</p>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-foggy">
          필터를 <strong className="text-ink">{step.angle}</strong>에 맞춘 뒤 플래시로 한 장 찍어주세요.
        </p>

        {isFirstInView && (
          <label className="mt-6 w-full max-w-xs text-left text-sm">
            <span className="font-medium text-foggy">이 위치 플래시 (기록)</span>
            <select
              value={flash}
              onChange={(e) => onFlash(e.target.value as FlashIntensity)}
              className="mt-1 h-11 w-full rounded-airbnb-sm border border-hairline bg-surface-soft px-3 text-sm"
            >
              <option value="quarter">1/4</option>
              <option value="eighth">1/8</option>
              <option value="sixteenth">1/16</option>
            </select>
          </label>
        )}

        <div
          className="mt-8 flex aspect-[4/3] w-full max-w-sm items-center justify-center rounded-airbnb border-2 border-dashed border-hairline bg-surface-soft"
          aria-hidden
        >
          <div className="text-center text-foggy">
            <span
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white"
              style={{ backgroundColor: SOCAR_BLUE }}
            >
              📷
            </span>
            <p className="mt-3 text-sm">아래 버튼으로 촬영</p>
          </div>
        </div>
      </div>
      <WizardFooter>
        <button
          type="button"
          onClick={onCapture}
          className="h-14 w-full rounded-airbnb-sm text-base font-semibold text-white shadow-lg transition active:scale-[0.98]"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          촬영하기
        </button>
      </WizardFooter>
    </>
  );
}

function ConfirmScreen({
  preview,
  angle,
  onRetake,
  onNext,
}: {
  preview: string;
  angle: string;
  onRetake: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative w-full max-w-sm overflow-hidden rounded-airbnb shadow-airbnb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={`편광 ${angle}`} className="aspect-[4/3] w-full object-cover" />
          <span
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-lg text-white shadow-md"
            style={{ backgroundColor: "#22c55e" }}
          >
            ✓
          </span>
        </div>
        <p className="mt-4 text-base font-semibold text-ink">촬영 완료 · {angle}</p>
        <p className="mt-1 text-sm text-foggy">잠시 후 다음 단계로 이동합니다</p>
      </div>
      <WizardFooter className="gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRetake}
          className="h-12 flex-1 rounded-airbnb-sm border border-hairline bg-canvas text-sm font-medium text-ink"
        >
          다시 찍기
        </button>
        <button
          type="button"
          onClick={onNext}
          className="h-12 flex-1 rounded-airbnb-sm text-sm font-semibold text-white"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          다음 →
        </button>
      </WizardFooter>
    </>
  );
}

function RelocateScreen({
  viewNumber,
  totalViews,
  onContinue,
}: {
  viewNumber: number;
  totalViews: number;
  onContinue: () => void;
}) {
  const remaining = totalViews - viewNumber;
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="text-6xl" aria-hidden>
          🔄
        </span>
        <h2 className="mt-4 text-xl font-bold text-ink">위치 {viewNumber} 완료</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-body">
          시편은 그대로 두고, 카메라만 시편 주위로{" "}
          <strong className="text-ink">약 90° 이동</strong>한 뒤 같은 4장을 찍습니다.
        </p>
        {remaining > 0 && (
          <p className="mt-4 rounded-airbnb-sm bg-surface-soft px-4 py-3 text-sm text-foggy">
            남은 위치 <strong className="text-ink">{remaining}</strong>곳
          </p>
        )}
      </div>
      <WizardFooter>
        <button
          type="button"
          onClick={onContinue}
          className="h-14 w-full rounded-airbnb-sm text-base font-semibold text-white"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          다음 위치 촬영
        </button>
      </WizardFooter>
    </>
  );
}

function FinishScreen({
  viewCount,
  loading,
  onMeasure,
  onAddView,
  onRestart,
}: {
  viewCount: number;
  loading: boolean;
  onMeasure: () => void;
  onAddView: () => void;
  onRestart: () => void;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="text-6xl" aria-hidden>
          ✅
        </span>
        <h2 className="mt-4 text-xl font-bold text-ink">모든 촬영이 끝났어요</h2>
        <p className="mt-2 text-sm text-body">
          {viewCount}개 위치 · 편광 4채널 · 총 {viewCount * 4}장
        </p>
      </div>
      <WizardFooter className="space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={onMeasure}
          className="h-14 w-full rounded-airbnb-sm text-base font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: SOCAR_BLUE }}
        >
          {loading ? "분석 중…" : "금 함량 측정하기"}
        </button>
        <button
          type="button"
          onClick={onAddView}
          className="h-12 w-full rounded-airbnb-sm border border-hairline text-sm font-medium text-ink"
        >
          + 위치 하나 더 추가
        </button>
        <button type="button" onClick={onRestart} className="w-full py-2 text-sm text-foggy underline-offset-2 hover:underline">
          처음부터
        </button>
      </WizardFooter>
    </>
  );
}

function WizardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mt-auto border-t border-hairline-soft pt-5 ${className}`}>{children}</div>;
}
