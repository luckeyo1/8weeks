import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL, CONTACT_FALLBACK } from "@/lib/contact";

/**
 * 계정 삭제 안내 (구글 플레이 '데이터 보안 > 계정 삭제 URL').
 * 앱을 설치하지 않아도 웹에서 삭제할 수 있다는 것과, 삭제되는 데이터·보관 기간을 밝힌다.
 */
export const metadata: Metadata = {
  title: "계정 삭제 안내",
  description: "기도 동행 계정과 데이터를 삭제하는 방법을 안내합니다.",
};

export default function AccountDeletionPage() {
  return (
    <LegalPage title="계정 삭제 안내" updatedAt="2026-11-24">
      <p>
        기도 동행(Android 앱: com.luckeyo.prayertogether) 계정과 데이터를
        삭제하는 방법입니다. 앱을 설치하지 않아도 웹에서 바로 삭제할 수 있어요.
      </p>

      <LegalSection heading="1. 직접 삭제하기 (바로 처리돼요)">
        <ol className="ml-4 flex list-decimal flex-col gap-1">
          <li>
            기도 동행 앱을 열거나, 웹에서{" "}
            <Link href="/login" className="text-primary underline underline-offset-2">
              로그인
            </Link>
            해요.
          </li>
          <li>아래 메뉴에서 [내 정보]로 이동해요.</li>
          <li>화면 맨 아래 [회원 탈퇴]를 누르고, [탈퇴하기]로 확인해요.</li>
        </ol>
        <p>탈퇴하는 즉시 아래 정보가 모두 삭제되고, 되돌릴 수 없어요.</p>
      </LegalSection>

      <LegalSection heading="2. 비밀번호를 잊었다면">
        <p>
          가입할 때 받은 복구 코드로{" "}
          <Link href="/recover" className="text-primary underline underline-offset-2">
            비밀번호를 다시 설정
          </Link>
          한 뒤, 위 방법으로 탈퇴할 수 있어요. 복구 코드도 없다면 아래
          연락처로 아이디와 함께 삭제를 요청해 주세요. 본인 확인 후 삭제해
          드립니다.
        </p>
      </LegalSection>

      <LegalSection heading="3. 삭제되는 정보">
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>계정 정보: 아이디, 이름, 교회명, 비밀번호·복구 코드(해시)</li>
          <li>내가 만든 기도제목과 기간 연장·변화·응답 기록</li>
          <li>함께 기도한 기록: 참여 내역, 매일 기도 체크</li>
          <li>성경 읽은 곳 기록</li>
          <li>알림 구독 정보</li>
          <li>내가 한 신고와 내 기도제목에 접수된 신고 기록</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. 보관 기간">
        <p>
          법령에 따라 따로 보관하는 정보는 없습니다. 다만 장애 복구를 위한
          데이터베이스 백업에는 최대 30일까지 남아 있을 수 있으며, 그 뒤에는
          자동으로 지워집니다.
        </p>
      </LegalSection>

      <LegalSection heading="5. 문의">
        <p>
          계정·데이터 삭제 요청과 문의:{" "}
          <span className="select-all text-ink">{CONTACT_EMAIL ?? CONTACT_FALLBACK}</span>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
