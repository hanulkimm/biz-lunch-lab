// 라이트/다크 테마 상태 — <html data-theme>로 적용, localStorage에 저장.
import { create } from "zustand";

const apply = (t) => {
  document.documentElement.dataset.theme = t;
};

const initial = localStorage.getItem("theme") === "dark" ? "dark" : "light";
apply(initial); // 모듈 로드 시 즉시 적용(깜빡임 최소화)

export const useThemeStore = create((set) => ({
  theme: initial,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      apply(next);
      return { theme: next };
    }),
}));
