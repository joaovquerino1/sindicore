"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ViewOption<T extends string = string> {
  value: T;
  label: string;
  icon: React.ElementType;
}

interface ViewSwitcherProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ViewOption<T>[];
  className?: string;
}

export function ViewSwitcher<T extends string>({
  value,
  onChange,
  options,
  className,
}: ViewSwitcherProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <Button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 px-2.5 text-xs font-medium transition-colors",
              active
                ? "bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            )}
            onClick={() => onChange(opt.value)}
            title={opt.label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
