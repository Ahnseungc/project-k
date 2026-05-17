import type { PolChannel } from "@/lib/types";

export interface FlatStep {
  viewIndex: number;
  channel: PolChannel;
  angle: string;
  label: string;
}

export type GuideVariant = "welcome" | "newView" | "rotate" | "flash";

export interface GuideConfig {
  variant: GuideVariant;
  title: string;
  body: string;
  hint?: string;
}

export function getGuideConfig(
  stepIndex: number,
  step: FlatStep,
  viewNumber: number,
): GuideConfig | null {
  if (stepIndex === 0) {
    return {
      variant: "welcome",
      title: "이렇게 찍어주세요",
      body: "플래시 ON · 시편 고정 · 편광 필터 각도마다 한 장씩 순서대로 촬영합니다.",
      hint: "아래 촬영하기 버튼을 누르면 카메라가 열립니다",
    };
  }

  if (stepIndex > 0 && stepIndex % 4 === 0) {
    return {
      variant: "newView",
      title: `위치 ${viewNumber} · 첫 장`,
      body: "시편은 그대로, 카메라만 시편 주위로 돌린 뒤 같은 거리에서 4장을 찍어주세요.",
      hint: "플래시와 배경은 이전 위치와 같게 유지",
    };
  }

  const channelHint: Record<string, string> = {
    I0: "필터 눈금을 0°에 맞춘 뒤 촬영",
    I90: "필터를 90°로 돌린 뒤 같은 위치에서 촬영",
    I45: "필터를 45°로 돌린 뒤 촬영",
    I135: "필터를 135°로 돌린 뒤 마지막 채널",
  };

  return {
    variant: "rotate",
    title: `편광 ${step.angle} 촬영`,
    body: channelHint[step.channel] ?? `편광 필터를 ${step.angle}에 맞추고 플래시로 한 장 찍어주세요.`,
    hint: "시편·거리·플래시 밝기는 바꾸지 마세요",
  };
}
