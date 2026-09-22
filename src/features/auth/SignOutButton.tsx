"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { signOut } from "./actions";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      fullWidth
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.replace("/");
          router.refresh();
        })
      }
    >
      로그아웃
    </Button>
  );
}
