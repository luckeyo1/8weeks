import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { CONTACT_EMAIL, CONTACT_FALLBACK } from "@/lib/contact";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "기도 동행이 수집하는 정보와 이용·보관·삭제 방법을 안내합니다.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보 처리방침" updatedAt="2026-11-24">
      <p>
        기도 동행(이하 &ldquo;서비스&rdquo;)은 함께 기도하는 사람들을 잇기 위한
        서비스입니다. 아래 방침은 웹과 Android 앱(com.luckeyo.prayertogether)에서
        서비스가 어떤 정보를 어떻게 다루는지 설명합니다.
      </p>

      <LegalSection heading="1. 수집하는 정보">
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>가입 정보: 아이디, 비밀번호(해시 저장), 이름, 교회명(선택)</li>
          <li>
            카카오 로그인 시: 카카오 회원번호, 카카오 닉네임(이름으로 사용). 카카오
            이메일·전화번호·프로필 사진은 받지 않으며, 카카오 액세스 토큰은 저장하지
            않습니다.
          </li>
          <li>
            서비스 이용 정보: 작성한 기도제목, 함께 기도하기 참여 내역, 매일 기도
            체크 기록, 기도 종료·연장·응답 기록, 성경 읽기 기록(읽은 날짜와 장)
          </li>
          <li>
            알림 정보(선택): 기기에서 알림을 켠 경우, 알림을 보내기 위한 구독
            정보(푸시 엔드포인트·키)와 알림 받을 시간. 알림을 끄면 구독 정보는
            즉시 삭제됩니다. 기기의 푸시 서비스(Google·Apple)에는 알림 내용을 싣지
            않으며, 알림 문구는 기기가 서비스에서 직접 받아옵니다.
          </li>
          <li>
            신고 정보(선택): 기도제목을 신고한 경우 신고 사유와 적은 내용, 신고
            대상 기도제목
          </li>
          <li>
            자동 생성 정보: 접속 일시 등 서비스 운영에 필요한 최소한의 기록
          </li>
        </ul>
        <p>
          비밀번호는 복호화할 수 없는 방식(PBKDF2 해시)으로만 저장하며, 원문은
          보관하지 않습니다. 계정 복구 코드도 같은 방식으로 해시 저장합니다.
        </p>
        <p>
          위치·연락처·사진 등 기기 정보나, 광고 식별자는 수집하지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="2. 정보를 쓰는 목적">
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>로그인 및 본인 확인</li>
          <li>기도제목 작성·공유와 함께 기도하기 기능 제공</li>
          <li>매일 기도 체크와 기간 종료·업데이트 안내</li>
          <li>성경 읽은 곳 기록과 통독 현황 표시</li>
          <li>이용자가 켠 경우에 한해, 정한 시간에 매일 알림 발송</li>
          <li>부적절한 기도제목 신고 접수와 처리</li>
          <li>서비스 운영·개선 및 오류 대응</li>
        </ul>
        <p>
          수집한 정보는 위 목적 범위에서만 쓰며, 그 외 목적으로 이용하거나 외부에
          제공하지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="3. 민감정보의 취급">
        <p>
          기도제목과 기도 기록은 신앙·개인의 상황이 담길 수 있는{" "}
          <strong className="font-semibold text-ink">민감한 정보</strong>로
          보고 신중히 다룹니다.
        </p>
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>전송 구간은 HTTPS로 암호화하며, 비밀번호·복구 코드는 해시로만 저장합니다.</li>
          <li>기도제목 내용은 광고·분석·외부 제공에 일절 사용하지 않습니다.</li>
          <li>
            성경 읽기 기록은 본인에게만 보이며, 함께 기도하는 사람을 포함한
            다른 이용자에게 공개하지 않습니다.
          </li>
          <li>
            이용 통계를 볼 때에도 기도제목 내용·비밀번호·초대 링크는 기록하거나
            분석하지 않습니다.
          </li>
          <li>
            운영자 관리 화면은 접근이 제한되며, 운영상 꼭 필요한 최소한의 범위에서만
            열람합니다. 신고된 기도제목은 신고를 처리하기 위해 운영자가 내용을
            확인할 수 있습니다. 신고한 사람은 작성자에게 알리지 않습니다.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. 기도제목의 공개 범위">
        <p>
          기도제목은 공개되지 않습니다. 작성자와, 작성자가 보낸 초대 링크를
          수락한 사람에게만 보입니다. 검색 엔진에 색인되지 않으며, 초대 링크를
          수락하기 전에는 기도제목의 내용이 보이지 않습니다. 작성자는 언제든
          초대 링크를 잠그거나 특정 동행자의 접근을 해제할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="5. 제3자 제공·위탁">
        <p>
          서비스는 이용자의 정보를 외부에 판매하거나 광고 목적으로 제공하지
          않습니다. 서비스 운영을 위해 클라우드 인프라(호스팅·데이터베이스)와
          알림 발송을 위한 기기 제조사의 푸시 서비스(예: Google, Apple), 카카오
          로그인을 선택한 경우 로그인 인증을 위한 카카오를 거치며,
          이 과정에서 정보가 처리·전달될 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="6. 보관과 삭제">
        <p>
          이용자는 언제든 [내 정보] 화면에서 회원 탈퇴를 할 수 있습니다. 탈퇴
          시 계정 정보와 내가 만든 기도제목, 함께 기도한 기록, 성경 읽기 기록,
          알림 구독 정보가 모두 삭제되고, 카카오로 가입했다면 카카오 계정과의
          연결도 끊습니다. 관련 법령에 따라 보관이 필요한 경우를 제외하고, 삭제된
          정보는 복구되지 않습니다.
        </p>
        <p>
          앱을 설치하지 않아도 웹에서 로그인해 같은 방법으로 탈퇴할 수 있습니다.
          로그인할 수 없는 상황이라면 아래 연락처로 아이디와 함께 삭제를 요청해
          주세요. 본인 확인 후 처리해 드립니다. 자세한 방법은{" "}
          <Link href="/account-deletion" className="text-primary underline underline-offset-2">
            계정 삭제 안내
          </Link>
          를 참고해 주세요.
        </p>
        <p>
          장애 복구를 위한 데이터베이스 백업에는 삭제된 정보가 최대 30일까지 남아
          있을 수 있으며, 그 뒤에는 자동으로 지워집니다.
        </p>
      </LegalSection>

      <LegalSection heading="7. 이용자의 권리">
        <p>
          이용자는 자신의 정보를 조회·수정하거나 처리 정지를 요청할 수 있으며,
          회원 탈퇴로 삭제를 요청할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="8. 문의 · 삭제 요청">
        <p>
          개인정보 처리와 계정·데이터 삭제에 관한 문의는 아래로 연락해 주세요.
          <br />
          {CONTACT_EMAIL ? "이메일: " : "연락처: "}
          <span className="select-all text-ink">{CONTACT_EMAIL ?? CONTACT_FALLBACK}</span>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
