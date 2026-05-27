"use client";

import type { SingleImageEstimate } from "@/lib/types";
import { useState } from "react";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";

function confidenceTone(level: SingleImageEstimate["confidence"]): "default" | "warning" {
  return level === "high" ? "default" : "warning";
}

function flagLabel(flag: SingleImageEstimate["flags"][number]): string {
  const labels = {
    non_gold_candidate: "비금속 후보",
    mixed_material_suspected: "복합 소재 의심",
    background_too_complex: "배경 복잡",
  };
  return labels[flag];
}

export function SimpleEstimatePanel() {
  const [images, setImages] = useState<string[]>([]);
  const [result, setResult] = useState<SingleImageEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, 2);
    const urls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
            reader.readAsDataURL(file);
          }),
      ),
    );
    setImages(urls);
    setResult(null);
  };

  const run = async () => {
    if (!images.length) {
      setError("최소 1장 이미지를 업로드해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single_image", images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      setResult(data as SingleImageEstimate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "간편 추정 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>간편 모드 (서비스 기본)</CardTitle>
        <CardDescription>
          일반 사진 1~2장으로 함량 범위를 추정합니다. 확정값은 제공하지 않으며 참고용으로만 사용됩니다.
        </CardDescription>

        <div className="mt-5 space-y-3 rounded-airbnb-sm border border-hairline-soft bg-surface-soft p-4 text-sm text-body">
          <p>촬영 가이드</p>
          <ul className="list-disc space-y-1 pl-5 text-foggy">
            <li>흰 배경, 약한 그림자, 과한 반사 피하기</li>
            <li>정면 1장 + 약간 기울인 1장 권장</li>
          </ul>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => void onPick(e.target.files)}
          className="mt-6 block w-full text-sm file:mr-3 file:rounded-airbnb-sm file:border-0 file:bg-ink file:px-4 file:py-2 file:text-white"
        />

        {images.length > 0 && (
          <p className="mt-3 text-sm text-foggy">업로드됨: {images.length}장 (최대 2장)</p>
        )}

        <Button className="mt-6 w-full" onClick={run} disabled={loading || images.length === 0}>
          {loading ? "추정 중…" : "간편 추정 실행"}
        </Button>
      </Card>

      {error && (
        <p className="rounded-airbnb-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {result && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foggy">1차 분류</p>
              <p className="text-xl font-bold text-ink">
                {result.is_gold_like ? "금 후보" : "금이 아닐 가능성 높음"} · {result.material_class}
              </p>
            </div>
            <Badge tone={confidenceTone(result.confidence)}>신뢰도 {result.confidence}</Badge>
          </div>

          {result.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.flags.map((flag) => (
                <Badge key={flag} tone="warning">
                  {flagLabel(flag)}
                </Badge>
              ))}
            </div>
          )}

          {result.result_usable ? (
            <>
              <div className="mt-4">
                <p className="text-sm text-foggy">추정 범위</p>
                <p className="text-3xl font-bold text-ink">{result.karat_range}</p>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <Prob label="10~14K" value={result.probabilities["10-14K"]} />
                <Prob label="14~18K" value={result.probabilities["14-18K"]} />
                <Prob label="18~24K" value={result.probabilities["18-24K"]} />
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-airbnb-sm border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              K/함량 결과를 숨김 처리했습니다. 비금속 가능성 또는 복합 파츠 영향으로 단일 금속 판별이
              어렵습니다.
            </div>
          )}

          {result.needs_retake && (
            <div className="mt-4 rounded-airbnb-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">재촬영 권장</p>
              <ul className="mt-1 list-disc pl-5">
                {result.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <ul className="mt-2 list-disc pl-5">
                {result.guidance.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-foggy">{result.disclaimer}</p>
        </Card>
      )}
    </div>
  );
}

function Prob({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-airbnb-sm border border-hairline p-3">
      <p className="text-xs text-foggy">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{(value * 100).toFixed(0)}%</p>
    </div>
  );
}
