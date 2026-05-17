import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-airbnb border border-hairline bg-canvas p-6 shadow-airbnb-hover ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-[22px] font-medium leading-tight tracking-tight text-ink ${className}`}>
      {children}
    </h2>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`mt-2 text-sm leading-relaxed text-foggy ${className}`}>{children}</p>;
}
