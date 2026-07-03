import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { getMe } from "./api/auth";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Admin from "./pages/Admin";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Lunch from "./pages/Lunch";
import Map from "./pages/Map";
import MyPage from "./pages/MyPage";
import ReviewWrite from "./pages/ReviewWrite";
import Roulette from "./pages/Roulette";
import Signup from "./pages/Signup";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const { token, user, setUser, logout } = useAuthStore();

  // 토큰이 있으면 세션 유저 복원 — 공개 페이지(지도 등)에서도 로그인 상태가
  // 유지되도록(리팩토링 후 /map이 ProtectedRoute를 안 거치는 문제 보완).
  useEffect(() => {
    if (token && !user) {
      getMe().then(setUser).catch(() => logout());
    }
  }, [token, user, setUser, logout]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        {/* 지도·룰렛은 비회원도 둘러볼 수 있게 공개 (유입 장벽 완화) */}
        <Route path="/map" element={<Map />} />
        <Route path="/roulette" element={<Roulette />} />
        <Route
          path="/review/write"
          element={
            <ProtectedRoute>
              <ReviewWrite />
            </ProtectedRoute>
          }
        />
        <Route path="/lunch" element={<ProtectedRoute><Lunch /></ProtectedRoute>} />
        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
