/**
 * Document Picture-in-Picture (크롬·엣지 116+ 데스크톱): 다른 창 위에 늘 떠 있는 작은 창.
 * TypeScript 기본 타입에 아직 없어 필요한 만큼만 선언한다.
 */
export interface DocumentPictureInPicture extends EventTarget {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  readonly window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function isPipSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

/**
 * 본 창의 스타일(Tailwind·글꼴)을 작은 창에 그대로 옮긴다.
 * 같은 출처 스타일시트는 규칙을 글자로 복사하고(링크를 복제하면 새 문서에서 불러오지 않는 경우가 있다),
 * 다른 출처(글꼴 CDN 등)라 규칙을 읽을 수 없으면 같은 주소의 링크를 새로 만든다.
 */
export function copyStyles(target: Document): void {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      const style = target.createElement("style");
      style.textContent = css;
      target.head.appendChild(style);
    } catch {
      if (!sheet.href) continue;
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      if (sheet.media.mediaText) link.media = sheet.media.mediaText;
      target.head.appendChild(link);
    }
  }
}
