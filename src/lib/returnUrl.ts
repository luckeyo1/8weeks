/**
 * 로그인/가입 후 돌아갈 주소. 같은 사이트 안의 경로만 허용한다(오픈 리다이렉트 방지).
 */
export function safeReturnUrl(url: string | null | undefined): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

/** "/join/<token>" 형태면 초대 토큰을, 아니면 null */
export function inviteTokenFrom(returnUrl: string): string | null {
  const m = /^\/join\/([A-Za-z0-9]+)$/.exec(returnUrl);
  return m?.[1] ?? null;
}
