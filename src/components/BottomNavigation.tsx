"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

function Icon({ path }: { path: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "홈",
    match: (p) => p === "/home",
    icon: <Icon path="M3 10.5L12 3l9 7.5M5 9.5V20h14V9.5" />,
  },
  {
    href: "/my-prayers",
    label: "나의 기도",
    match: (p) => p.startsWith("/my-prayers") || p.startsWith("/prayers/"),
    icon: <Icon path="M4 5h16M4 12h16M4 19h10" />,
  },
  {
    href: "/prayers/new",
    label: "기도 만들기",
    match: (p) => p === "/prayers/new",
    icon: <Icon path="M12 5v14M5 12h14" />,
  },
  {
    href: "/profile",
    label: "내 정보",
    match: (p) => p.startsWith("/profile"),
    icon: <Icon path="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-app border-t border-line bg-surface/95 pb-safe backdrop-blur"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-ink-soft",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
