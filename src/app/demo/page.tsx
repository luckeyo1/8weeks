import type { Metadata } from "next";
import { DemoExperience } from "@/features/demo/DemoExperience";

export const metadata: Metadata = {
  title: "체험해보기",
  description: "가입 전에 기도 동행의 '오늘의 기도' 화면을 직접 체험해보세요.",
};

export default function DemoPage() {
  return (
    <main className="app-shell">
      <DemoExperience />
    </main>
  );
}
