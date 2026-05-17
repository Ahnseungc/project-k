"use client";

import type { MeasurementResult } from "@/lib/types";
import { useCallback, useState } from "react";
import { ResultCard } from "./ResultCard";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";

const KARAT_PRESETS = [10, 14, 18, 22, 24];

export function MeasurePanel() {
  const [karat, setKarat] = useState(18);
  const [nViews, setNViews] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "synthetic",
          nominal_karat: karat,
          n_views: nViews,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setResult(data as MeasurementResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "측정 실패");
    } finally {
      setLoading(false);
    }
  }, [karat, nViews]);

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>합성 캡처 시뮬레이션</CardTitle>
        <CardDescription>
          알고리즘 검증용 가상 편광 데이터입니다. 실제 촬영은 「스마트폰 촬영」 탭을 사용하세요.
        </CardDescription>

        <div className="mt-6 space-y-6">
          <div>
            <label className="mb-2 flex justify-between text-sm font-medium text-ink">
              <span>입력 K</span>
              <span className="font-semibold text-rausch">{karat}K</span>
            </label>
            <input
              type="range"
              min={8}
              max={24}
              step={0.5}
              value={karat}
              onChange={(e) => setKarat(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-[#ff385c]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {KARAT_PRESETS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKarat(k)}
                  className={`rounded-pill border px-4 py-2 text-sm font-medium transition ${
                    karat === k
                      ? "border-ink bg-ink text-white"
                      : "border-hairline bg-canvas text-foggy hover:border-ink hover:text-ink"
                  }`}
                >
                  {k}K
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 flex justify-between text-sm font-medium text-ink">
              <span>뷰 수</span>
              <span>{nViews}</span>
            </label>
            <input
              type="range"
              min={4}
              max={24}
              step={1}
              value={nViews}
              onChange={(e) => setNViews(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-[#ff385c]"
            />
          </div>
        </div>

        <Button className="mt-8 w-full" disabled={loading} onClick={run}>
          {loading ? "분석 중…" : "합성 데이터로 측정"}
        </Button>
      </Card>

      {error && (
        <p className="rounded-airbnb-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {result && <ResultCard result={result} inputKarat={karat} />}
    </div>
  );
}
