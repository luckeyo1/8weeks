"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { deleteAccount } from "./actions";

export function DeleteAccountButton() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-center px-2 py-1 text-[13px] text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        회원 탈퇴
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="회원 탈퇴">
        <div className="flex flex-col gap-4 px-5 pb-6 pt-5">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden />
          <h2 className="text-base font-semibold text-ink">정말 탈퇴할까요?</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            탈퇴하면 내가 만든 기도제목과 함께 기도한 기록이 모두 삭제돼요. 삭제한
            내용은 되돌릴 수 없어요.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteAccount();
                  if (res.ok) {
                    router.replace("/");
                    router.refresh();
                  } else {
                    toast.show(res.message, "error");
                  }
                })
              }
            >
              탈퇴하기
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => setOpen(false)}
            >
              다음에
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
