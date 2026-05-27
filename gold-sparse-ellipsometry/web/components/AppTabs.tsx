"use client";

import { MeasurePanel } from "./MeasurePanel";
import { PhotoCapturePanel } from "./PhotoCapturePanel";
import { SimpleEstimatePanel } from "./SimpleEstimatePanel";
import { SegmentedControl } from "./ui/SegmentedControl";
import { useState } from "react";

type Tab = "simple" | "photo" | "synthetic";

export function AppTabs() {
  const [tab, setTab] = useState<Tab>("simple");

  return (
    <div className="space-y-8">
      <SegmentedControl
        options={[
          { id: "simple", label: "간편 모드(기본)" },
          { id: "photo", label: "정밀 모드(편광+다각도)" },
          { id: "synthetic", label: "연구용 합성 시뮬" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "simple" ? <SimpleEstimatePanel /> : tab === "photo" ? <PhotoCapturePanel /> : <MeasurePanel />}
    </div>
  );
}
