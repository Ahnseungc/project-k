import { AppTabs } from "@/components/AppTabs";

export default function Home() {
  return (
    <main className="mx-auto max-w-content px-6 pb-16 pt-10 md:px-10">
      <section className="mb-8 max-w-2xl">
        <h1 className="text-[28px] font-bold leading-snug tracking-tight text-ink">
          금 함량을 측정해 보세요
        </h1>
        <p className="mt-3 text-base leading-relaxed text-body">
          서비스 기본은 일반 사진 기반 간편 모드입니다. 정밀 측정이 필요하면 편광 4채널 × 다각도
          촬영 정밀 모드를 사용하세요.
        </p>
      </section>

      <AppTabs />

      <section
        id="guide"
        className="mt-16 grid gap-6 border-t border-hairline-soft pt-12 md:grid-cols-3"
      >
        <GuideCard
          step="1"
          title="간편 모드"
          body="일반 사진 1~2장으로 범위형 추정(확정값 아님)"
        />
        <GuideCard step="2" title="정밀 모드" body="4방향 이상, 편광 4채널 촬영으로 회귀 추정" />
        <GuideCard step="3" title="주의" body="간편 모드는 거래/가격 결정에 사용 불가" />
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
