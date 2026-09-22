"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
  DURATION_PRESETS,
  MAX_DURATION_DAYS,
  MIN_DURATION_DAYS,
} from "@/lib/date";
import { track } from "@/lib/analytics";
import { createPrayer } from "./actions";

const formSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "기도제목을 입력해주세요.")
      .max(50, "50자 이내로 입력해주세요."),
    description: z.string().trim().max(500, "500자 이내로 입력해주세요."),
    durationChoice: z.enum(["7", "14", "30", "custom"]),
    customDays: z.coerce.number().int().optional(),
  })
  .refine(
    (v) =>
      v.durationChoice !== "custom" ||
      (v.customDays !== undefined &&
        v.customDays >= MIN_DURATION_DAYS &&
        v.customDays <= MAX_DURATION_DAYS),
    {
      message: `직접 설정은 ${MIN_DURATION_DAYS}~${MAX_DURATION_DAYS}일 사이로 정해주세요.`,
      path: ["customDays"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

export function CreatePrayerForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", durationChoice: "7" },
  });

  const [titleLen, setTitleLen] = useState(0);
  const [descLen, setDescLen] = useState(0);
  const choice = watch("durationChoice");

  function onSubmit(values: FormValues) {
    const durationDays =
      values.durationChoice === "custom"
        ? Number(values.customDays)
        : Number(values.durationChoice);

    startTransition(async () => {
      const res = await createPrayer({
        title: values.title,
        description: values.description || undefined,
        durationDays,
      });
      if (res.ok) {
        track("prayer_created", { durationDays });
        router.replace(`/prayers/${res.data.prayerId}`);
        router.refresh();
      } else {
        toast.show(res.message, "error");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Input
        label="기도제목"
        placeholder="함께 기도했으면 하는 내용을 적어주세요."
        maxLength={50}
        counter={{ value: titleLen, max: 50 }}
        error={errors.title?.message}
        {...register("title", {
          onChange: (e) => setTitleLen(e.target.value.trim().length),
        })}
        autoFocus
      />

      <Textarea
        label="자세한 내용"
        placeholder="기도제목에 대해 조금 더 알려주세요."
        rows={5}
        maxLength={500}
        counter={{ value: descLen, max: 500 }}
        error={errors.description?.message}
        {...register("description", {
          onChange: (e) => setDescLen(e.target.value.trim().length),
        })}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-ink">
          함께 기도할 기간
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {DURATION_PRESETS.map((d) => (
            <ChoiceChip
              key={d}
              label={`${d}일`}
              active={choice === String(d)}
              onClick={() => setValue("durationChoice", String(d) as "7")}
            />
          ))}
          <ChoiceChip
            label="직접"
            active={choice === "custom"}
            onClick={() => setValue("durationChoice", "custom")}
          />
        </div>
        {choice === "custom" && (
          <Input
            type="number"
            inputMode="numeric"
            min={MIN_DURATION_DAYS}
            max={MAX_DURATION_DAYS}
            placeholder={`${MIN_DURATION_DAYS}~${MAX_DURATION_DAYS}일`}
            error={errors.customDays?.message}
            className="mt-1"
            {...register("customDays")}
          />
        )}
      </fieldset>

      {/* 공개 범위 고정 (명세 9) */}
      <div className="rounded-card bg-primary-soft/60 px-4 py-3 text-sm text-primary">
        링크 또는 QR을 받은 사람만 볼 수 있어요.
      </div>

      {/* Privacy 안내 (명세 54) */}
      <p className="text-xs leading-relaxed text-ink-soft">
        기도제목은 링크를 받은 사람에게만 보여요.
      </p>

      <Button type="submit" size="lg" fullWidth loading={pending}>
        기도제목 만들기
      </Button>
    </form>
  );
}

function ChoiceChip({
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
