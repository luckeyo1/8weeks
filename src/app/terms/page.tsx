import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "이용약관",
  description: "기도 동행 서비스 이용에 관한 약관입니다.",
};

export default function TermsPage() {
  return (
    <LegalPage title="이용약관" updatedAt="2026-10-15">
      <p>
        이 약관은 기도 동행(이하 &ldquo;서비스&rdquo;) 이용에 관한 조건을
        정합니다. 정식 출시 전 초안이며, 법적 검토 후 보완될 수 있습니다.
      </p>

      <LegalSection heading="1. 서비스의 목적">
        <p>
          서비스는 함께 기도했으면 하는 마음을 나누고, 서로를 위해 매일 기도하며
          기억할 수 있도록 돕는 것을 목적으로 합니다. 좋아요·팔로워·피드 같은
          소셜 기능이나 기도 횟수 경쟁을 제공하지 않습니다.
        </p>
      </LegalSection>

      <LegalSection heading="2. 계정">
        <ul className="ml-4 flex list-disc flex-col gap-1">
          <li>가입 시 정확한 정보를 입력해 주세요.</li>
          <li>
            비밀번호 관리 책임은 이용자에게 있으며, 타인과 계정을 공유하지 않기를
            권장합니다.
          </li>
          <li>이용자는 언제든 회원 탈퇴를 할 수 있습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. 이용자의 책임">
        <p>
          이용자는 다른 사람의 권리를 침해하거나 법령을 위반하는 내용을 작성·공유
          해서는 안 됩니다. 함께 기도하기로 받은 기도제목은 서로의 신뢰 안에서만
          다루어 주세요. 받은 기도제목의 내용을 작성자의 동의 없이 외부에
          공개하거나 전달하지 않기를 당부합니다.
        </p>
      </LegalSection>

      <LegalSection heading="4. 콘텐츠의 권리">
        <p>
          이용자가 작성한 기도제목과 기록의 권리는 이용자에게 있습니다. 서비스는
          기능 제공에 필요한 범위에서만 해당 내용을 저장·표시합니다.
        </p>
      </LegalSection>

      <LegalSection heading="5. 서비스의 변경·중단">
        <p>
          서비스는 운영상·기술상 필요에 따라 내용을 변경하거나 일시 중단할 수
          있습니다. 중요한 변경은 서비스 내 안내를 통해 알립니다.
        </p>
      </LegalSection>

      <LegalSection heading="6. 책임의 한계">
        <p>
          서비스는 안정적인 제공을 위해 노력하지만, 천재지변·장애 등 불가항력으로
          인한 손해에 대해서는 책임이 제한될 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="7. 문의">
        <p>
          약관에 관한 문의는 서비스 운영자에게 연락해 주세요. (연락처는 정식
          출시 시 안내됩니다.)
        </p>
      </LegalSection>
    </LegalPage>
  );
}
