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

export default function Logo({
  variant = "full",
  className,
  iconSize = 36,
  textClass,
  subtitleClass,
  hideSubtitle = false,
}: LogoProps) {
  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Outer petal ring — blossom */}
      <path
        d="M256 56C256 56 208 136 256 192C304 136 256 56 256 56Z"
        fill="url(#logoGrad)"
        opacity="0.7"
      />
      <path
        d="M256 56C256 56 160 120 192 200C240 168 256 56 256 56Z"
        fill="url(#logoGrad)"
        opacity="0.5"
      />
      <path
        d="M256 56C256 56 352 120 320 200C272 168 256 56 256 56Z"
        fill="url(#logoGrad)"
        opacity="0.5"
      />
      <path
        d="M120 192C120 192 184 160 216 216C168 248 120 192 120 192Z"
        fill="url(#logoGrad)"
        opacity="0.55"
      />
      <path
        d="M392 192C392 192 328 160 296 216C344 248 392 192 392 192Z"
        fill="url(#logoGrad)"
        opacity="0.55"
      />
      {/* Medical cross center */}
      <rect x="234" y="194" width="44" height="124" rx="8" fill="white" />
      <rect x="194" y="234" width="124" height="44" rx="8" fill="white" />
      {/* Inner glow circle */}
      <circle cx="256" cy="256" r="48" fill="white" opacity="0.15" />
      {/* Bottom petal */}
      <path
        d="M256 340C256 340 208 300 256 276C304 300 256 340 256 340Z"
        fill="url(#logoGrad)"
        opacity="0.4"
      />
      {/* Defs */}
      <defs>
        <linearGradient id="logoGrad" x1="128" y1="56" x2="384" y2="456" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16a34a" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
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
