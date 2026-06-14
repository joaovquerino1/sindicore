import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lockup oficial da marca: squircle em gradiente púrpura + wordmark
 * "SindiCORE" em Sora, com o sufixo "CORE" em gradiente e o selo
 * "by LAMPY" opcional. `tone="light"` para fundos escuros.
 */
export function BrandLogo({
  size = "md",
  byline = false,
  tone = "auto",
  className,
}: {
  size?: "sm" | "md" | "lg";
  byline?: boolean;
  tone?: "auto" | "light";
  className?: string;
}) {
  const box =
    size === "lg" ? "w-12 h-12 rounded-2xl" : size === "sm" ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const word = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span
        className={cn(
          box,
          "flex items-center justify-center bg-gradient-primary shadow-lg shadow-violet-600/30 flex-shrink-0"
        )}
      >
        <Building2 className={cn(icon, "text-white")} />
      </span>
      <span className="min-w-0 leading-none">
        <span
          className={cn(
            word,
            "font-display font-bold tracking-tight block",
            tone === "light" ? "text-white" : "text-foreground"
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Sindi<span className="text-gradient">CORE</span>
        </span>
        {byline && (
          <span
            className={cn(
              "block text-[9px] uppercase tracking-[0.28em] mt-1",
              tone === "light" ? "text-white/50" : "text-muted-foreground"
            )}
          >
            by LAMPY
          </span>
        )}
      </span>
    </span>
  );
}
