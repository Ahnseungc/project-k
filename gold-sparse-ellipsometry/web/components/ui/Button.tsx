import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary";

export function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex h-12 items-center justify-center rounded-airbnb-sm px-6 text-base font-medium transition disabled:cursor-not-allowed";
  const styles = {
    primary:
      "bg-rausch text-white hover:bg-rausch-active disabled:bg-rausch-disabled",
    secondary:
      "border border-ink bg-canvas text-ink hover:bg-surface-soft disabled:opacity-50",
    tertiary: "bg-transparent text-ink underline-offset-2 hover:underline",
  }[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
