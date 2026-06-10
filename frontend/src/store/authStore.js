// 인증 상태 (zustand) — user, token, is_admin 관리.
// 토큰은 localStorage에 저장하여 새로고침에도 유지.
import { create } from "zustand";

export const useAuthStore = create((set) => ({
  token: localStorage.getItem("token") || null,
  user: null, // { id, name, team_id, is_admin } — /api/auth/me로 채움

  setToken: (token) => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    set({ token });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },
}));
