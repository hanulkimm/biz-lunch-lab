import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/common/ProtectedRoute";
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
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <Map />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review/write"
          element={
            <ProtectedRoute>
              <ReviewWrite />
            </ProtectedRoute>
          }
        />
        <Route path="/roulette" element={<ProtectedRoute><Roulette /></ProtectedRoute>} />
        <Route path="/lunch" element={<ProtectedRoute><Lunch /></ProtectedRoute>} />
        <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
