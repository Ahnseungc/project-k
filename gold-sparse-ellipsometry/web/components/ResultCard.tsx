import type { MeasurementResult } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";

export function ResultCard({
  result,
  inputKarat,
}: {
  result: MeasurementResult;
  inputKarat?: number;
}) {
  const delta = inputKarat != null ? result.karat - inputKarat : null;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-hairline bg-surface-soft px-6 py-8 text-center">
        <p className="text-sm font-medium text-foggy">예측 함량</p>
        <p className="mt-1 text-[64px] font-bold leading-none tracking-tight text-ink">
          {result.karat.toFixed(2)}
          <span className="ml-1 text-2xl font-semibold text-foggy">K</span>
        </p>
        <p className="mt-2 text-sm text-body">
          순금 {(result.gold_fraction * 100).toFixed(1)}% · 신뢰도{" "}
          {(result.confidence * 100).toFixed(0)}%
        </p>
        {delta != null && (
          <p className="mt-2 text-sm font-medium text-foggy">
            합성 입력 대비 {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)}K
          </p>
        )}
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <Stat label="굴절률 η" value={result.optical_features.eta_mean.toFixed(3)} />
        <Stat label="DoP" value={result.optical_features.dop_mean.toFixed(4)} />
        <Stat label="Specular κ" value={result.optical_features.kappa_s_mean.toFixed(4)} />
      </div>

      {result.flags.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-hairline-soft px-6 pb-4">
          {result.flags.map((f) => (
            <Badge key={f} tone={f === "low_confidence" ? "warning" : "default"}>
              {f}
            </Badge>
          ))}
        </div>
      )}

      <details className="border-t border-hairline-soft px-6 py-3">
        <summary className="cursor-pointer text-sm font-medium text-foggy hover:text-ink">
          파이프라인 로그
        </summary>
        <pre className="mt-3 max-h-48 overflow-auto rounded-airbnb-sm bg-surface-soft p-3 font-mono text-[11px] text-body">
          {JSON.stringify({ stage_log: result.stage_log, pipeline: result.pipeline }, null, 2)}
        </pre>
      </details>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-airbnb-sm border border-hairline bg-canvas px-4 py-3">
      <p className="text-xs font-medium text-foggy">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
