import { runPipeline } from "@/lib/pipeline";
import { estimateFromImageDataUrls } from "@/lib/singleImageEstimator";
import type { MeasureRequest } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MeasureRequest;
    if (body.mode !== "synthetic" && body.mode !== "upload" && body.mode !== "single_image") {
      return NextResponse.json(
        { error: "mode must be synthetic, upload, or single_image" },
        { status: 400 },
      );
    }
    if (body.mode === "single_image") {
      if (!body.images?.length) {
        return NextResponse.json(
          { error: "single_image 모드: 최소 1장, 권장 2장의 이미지가 필요합니다." },
          { status: 400 },
        );
      }
      const result = await estimateFromImageDataUrls(body.images);
      return NextResponse.json(result);
    }
    if (body.mode === "upload" && (!body.views || body.views.length < 4)) {
      return NextResponse.json(
        { error: "upload 모드: 최소 4개 각도(뷰), 각 뷰당 편광 4채널 필요" },
        { status: 400 },
      );
    }
    const result = await runPipeline(body);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "gold-sparse-ellipsometry",
    version: "0.1.0",
    modes: ["single_image", "upload", "synthetic"],
    endpoints: { measure: "POST /api/measure" },
  });
}
