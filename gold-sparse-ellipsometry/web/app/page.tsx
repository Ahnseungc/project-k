import { AppTabs } from "@/components/AppTabs";

export default function Home() {
  return (
    <main className="mx-auto max-w-content px-6 pb-16 pt-10 md:px-10">
      <section className="mb-8 max-w-2xl">
        <h1 className="text-[28px] font-bold leading-snug tracking-tight text-ink">
          금 함량을 측정해 보세요
        </h1>
        <p className="mt-3 text-base leading-relaxed text-body">
          한 장씩 찍으면 다음 단계로 자동 이동합니다. 최소 4방향 × 편광 4채널이면 측정할 수
          있습니다.
        </p>
      </section>

      <AppTabs />

      <section
        id="guide"
        className="mt-16 grid gap-6 border-t border-hairline-soft pt-12 md:grid-cols-3"
      >
        <GuideCard
          step="1"
          title="편광 4장"
          body="각 위치에서 필터 0°·45°·90°·135°로 플래시 촬영"
        />
        <GuideCard step="2" title="4방향 이상" body="시편 주위를 돌며 같은 과정 반복" />
        <GuideCard step="3" title="측정" body="업로드 후 η·DoP·K 결과 확인" />
      </section>

      <footer className="mt-16 border-t border-hairline pt-8 text-center text-[13px] text-foggy">
        <a
          href="https://arxiv.org/abs/2207.04236"
          className="font-medium text-ink underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Hwang et al., SIGGRAPH 2022
        </a>
        <span className="mx-2">·</span>
        <span>© Gold Meter Demo</span>
      </footer>
    </main>
  );
}

function GuideCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-airbnb border border-hairline bg-canvas p-5 shadow-airbnb-hover">
      <span className="text-xs font-bold uppercase tracking-wide text-foggy">Step {step}</span>
      <h3 className="mt-2 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-foggy">{body}</p>
    </div>
  );
}
