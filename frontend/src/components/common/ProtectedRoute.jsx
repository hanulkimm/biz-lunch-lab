// 로그인 보호 라우트. 토큰 없으면 로그인으로. 토큰만 있고 user가 없으면
// (새로고침 직후) /me로 사용자 정보를 복원한다. adminOnly로 관리자 제한도 지원.
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { getMe } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user, setUser, logout } = useAuthStore();
  const location = useLocation();
  const [loading, setLoading] = useState(!!token && !user);

  useEffect(() => {
    if (token && !user) {
      getMe()
        .then(setUser)
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
  }, [token, user, setUser, logout]);

  // 비로그인 → 로그인 페이지로(로그인 후 원래 가려던 곳으로 복귀).
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (loading) return <div className="auth-loading">불러오는 중…</div>;
  if (adminOnly && !user?.is_admin) return <Navigate to="/map" replace />;

  return children;
}
