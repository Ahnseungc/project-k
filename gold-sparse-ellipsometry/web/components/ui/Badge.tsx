type BadgeTone = "default" | "new" | "favorite" | "warning";

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  const tones = {
    default: "bg-surface-soft text-ink ring-1 ring-hairline",
    new: "bg-canvas text-ink ring-1 ring-hairline uppercase tracking-wider text-[8px] font-bold",
    favorite: "bg-canvas text-ink shadow-airbnb text-[11px] font-semibold",
    warning: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  };

  return (
    <span className={`inline-flex rounded-pill px-2.5 py-1 ${tones[tone]}`}>{children}</span>
  );
}
