import type { Config } from "tailwindcss";

/**
 * 디자인 방향 (명세 36~38):
 * - 차분하고 현대적, 넓은 여백, 부드러운 radius, 아주 미세한 shadow
 * - 오프화이트 배경, muted olive primary
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 명세 37
        canvas: "#FAFAF8", // 메인 배경 (오프화이트)
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#222222", // 텍스트
          soft: "#777777", // secondary text
        },
        line: "#ECEBE6", // 아주 옅은 구분선
        primary: {
          DEFAULT: "#6E7D66", // muted olive/green
          hover: "#5E6C57",
          soft: "#EDF0EA",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "16px",
        pill: "9999px",
      },
      boxShadow: {
        // 아주 미세한 그림자
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)",
        pop: "0 8px 30px rgba(0,0,0,0.08)",
      },
      maxWidth: {
        app: "480px", // 최대 content width (명세 39)
      },
      keyframes: {
        "check-pop": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "check-pop": "check-pop 0.28s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
