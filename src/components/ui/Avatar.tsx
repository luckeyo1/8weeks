import Image from "next/image";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** 프로필 이미지 없으면 닉네임 첫 글자로 대체 */
export function Avatar({ name, src, size = 44, className }: AvatarProps) {
  const initial = name.trim().charAt(0) || "?";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden={!src}
    >
      {src ? (
        <Image
          src={src}
          alt={`${name} 프로필 이미지`}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <span
          className="font-semibold"
          style={{ fontSize: Math.max(14, size * 0.4) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
