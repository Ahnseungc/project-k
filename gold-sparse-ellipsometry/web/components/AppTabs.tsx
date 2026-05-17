"use client";

import { MeasurePanel } from "./MeasurePanel";
import { PhotoCapturePanel } from "./PhotoCapturePanel";
import { SegmentedControl } from "./ui/SegmentedControl";
import { useState } from "react";

type Tab = "photo" | "synthetic";

export function AppTabs() {
  const [tab, setTab] = useState<Tab>("photo");

  return (
    <div className="space-y-8">
      <SegmentedControl
        options={[
          { id: "photo", label: "스마트폰 촬영" },
          { id: "synthetic", label: "합성 시뮬" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "photo" ? <PhotoCapturePanel /> : <MeasurePanel />}
    </div>
  );
}
