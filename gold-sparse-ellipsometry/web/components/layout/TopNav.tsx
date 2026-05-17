import Link from "next/link";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-20 max-w-content items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-airbnb-sm bg-rausch text-sm font-bold text-white">
            Au
          </span>
          <span className="text-base font-semibold tracking-tight text-ink">Gold Meter</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="제품">
          <NavTab label="측정" active />
          <NavTab label="가이드" href="#guide" />
          <span className="relative">
            <NavTab label="API" href="/api/measure" />
            <span className="absolute -right-3 -top-2 rounded-pill bg-canvas px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-ink ring-1 ring-hairline">
              NEW
            </span>
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://arxiv.org/abs/2207.04236"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-airbnb-sm px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-soft sm:inline-block"
          >
            논문
          </a>
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-canvas text-sm font-semibold text-foggy"
            aria-hidden
          >
            K
          </span>
        </div>
      </div>
    </header>
  );
}

function NavTab({
  label,
  active,
  href = "#",
}: {
  label: string;
  active?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`relative pb-1 text-base font-semibold transition ${
        active ? "text-ink" : "text-foggy hover:text-ink"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-ink" />
      )}
    </Link>
  );
}
