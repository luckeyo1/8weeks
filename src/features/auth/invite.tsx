import "server-only";

import { Avatar } from "@/components/ui/Avatar";
import { getJoinPreview } from "@/services/prayers";
import { isValidShareTokenFormat } from "@/lib/token";
import { inviteTokenFrom } from "@/lib/returnUrl";

/**
 * 초대 링크에서 넘어온 가입/로그인이면 초대한 사람 이름. 아니면 null.
 * (기도 내용은 수락 전 비공개이므로 이름만 쓴다)
 */
export async function inviterNameFor(
  returnUrl: string,
): Promise<string | null> {
  const token = inviteTokenFrom(returnUrl);
  if (!token || !isValidShareTokenFormat(token)) return null;
  try {
    const preview = await getJoinPreview(token, null);
    return preview.status === "ACTIVE" ? preview.owner.nickname : null;
  } catch {
    return null;
  }
}

/** 가입/로그인 화면 상단: 누구의 초대로 왔는지 이어서 보여준다(맥락 유지). */
export function InviteBanner({
  inviterName,
  hint,
}: {
  inviterName: string;
  hint: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-card border border-line bg-surface/95 p-3.5 shadow-card">
      <Avatar name={inviterName} size={40} />
      <p className="text-[14px] leading-snug text-ink">
        <span className="font-semibold">{inviterName}</span>님이 함께 기도해
        달라고 부탁했어요.
        <span className="mt-0.5 block text-[13px] text-ink-soft">{hint}</span>
      </p>
    </div>
  );
}
