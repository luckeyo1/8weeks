"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  DURATION_PRESETS,
  MAX_DURATION_DAYS,
  MIN_DURATION_DAYS,
} from "@/lib/date";

/** 7/14/30/직접 설정 기간 선택기 (명세 9/24) */
export function DurationPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (days: number | null) => void;
}) {
  const [custom, setCustom] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        {DURATION_PRESETS.map((d) => (
          <Chip
            key={d}
            label={`${d}일`}
            active={!custom && value === d}
            onClick={() => {
              setCustom(false);
              onChange(d);
            }}
          />
        ))}
        <Chip
          label="직접"
          active={custom}
          onClick={() => {
            setCustom(true);
            onChange(null);
          }}
        />
      </div>
      {custom && (
        <Input
          type="number"
          inputMode="numeric"
          min={MIN_DURATION_DAYS}
          max={MAX_DURATION_DAYS}
          placeholder={`${MIN_DURATION_DAYS}~${MAX_DURATION_DAYS}일`}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            onChange(Number.isNaN(n) ? null : n);
          }}
        />
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-[48px] rounded-card border text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-line bg-surface text-ink-soft hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}
