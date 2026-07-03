import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

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

export default function App() {
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
