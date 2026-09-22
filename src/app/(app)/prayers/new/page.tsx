import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/service";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreatePrayerForm } from "@/features/prayer/CreatePrayerForm";

export const metadata: Metadata = {
  title: "기도제목 만들기",
  robots: { index: false, follow: false },
};

export default async function NewPrayerPage() {
  await requireProfile();
  return (
    <div>
      <PageHeader title="기도제목 만들기" backHref="/home" />
      <div className="pt-4">
        <CreatePrayerForm />
      </div>
    </div>
  );
}
