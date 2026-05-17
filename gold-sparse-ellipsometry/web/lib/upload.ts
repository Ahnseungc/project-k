import { decodeViewChannels } from "./image-decode";
import type { UploadViewPayload, ViewCapture } from "./types";

export async function buildViewsFromUpload(payloads: UploadViewPayload[]): Promise<ViewCapture[]> {
  if (payloads.length < 4) {
    throw new Error("최소 4개 각도(뷰)가 필요합니다. 시편 주위를 돌며 촬영해 주세요.");
  }

  const sorted = [...payloads].sort((a, b) => a.viewIndex - b.viewIndex);
  const views: ViewCapture[] = [];

  for (const p of sorted) {
    for (const ch of ["I0", "I90", "I45", "I135"] as const) {
      if (!p.channels[ch]?.startsWith("data:")) {
        throw new Error(`뷰 ${p.viewIndex + 1}: ${ch} 이미지가 없습니다. 4방향 편광 사진을 모두 올려 주세요.`);
      }
    }
    const channels = await decodeViewChannels(p.channels);
    views.push({
      viewIndex: p.viewIndex,
      flashIntensity: p.flashIntensity,
      channels,
    });
  }

  return views;
}
