import { cn } from "@/lib/utils";

type LogoVariant = "icon" | "full" | "inline";

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  iconSize?: number;
  textClass?: string;
  subtitleClass?: string;
  hideSubtitle?: boolean;
}

const LOGO_SRC = "/images/hosp-logo/life-blossom-logo.png";

export default function Logo({
  variant = "full",
  className,
  iconSize = 36,
  textClass,
  subtitleClass,
  hideSubtitle = false,
}: LogoProps) {
  const icon = (
    <div
      className="shrink-0 rounded-xl bg-white overflow-hidden flex items-center justify-center shadow-sm ring-1 ring-black/5"
      style={{ width: Math.round(iconSize * 1.5), height: Math.round(iconSize * 1.5) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt="Life Blossom Care & Cure Hospital"
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );

  if (variant === "icon") {
    return <div className={cn("inline-flex items-center justify-center", className)}>{icon}</div>;
  }

  if (variant === "inline") {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        {icon}
        <div>
          <p className={cn("text-sm font-semibold text-foreground", textClass)}>
            Life Blossom
          </p>
          <p className={cn("text-[11px] text-text-secondary leading-tight", hideSubtitle && "hidden", subtitleClass)}>
            Care &amp; Cure Hospital
          </p>
        </div>
      </div>
    );
  }

  // full variant — centered, larger layout
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {icon}
      <div className="text-center">
        <p className={cn("text-lg font-bold text-foreground", textClass)}>
          Life Blossom
        </p>
        <p className={cn("text-xs text-text-secondary", hideSubtitle && "hidden", subtitleClass)}>
          Care &amp; Cure Hospital
        </p>
      </div>
    </div>
  );
}
