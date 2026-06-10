// Map — Phase 1에서는 로그인 성공 랜딩 자리표시자. 카카오 지도는 Phase 2에서 구현.
import { useAuthStore } from "../store/authStore";

export default function Map() {
  const { user, logout } = useAuthStore();

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>🗺️ 맛집 지도</h1>
      <p>
        로그인됨: <b>{user?.name}</b>
        {user?.is_admin && (
          <span
            style={{
              marginLeft: 8,
              padding: "2px 8px",
              background: "#ffd43b",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            관리자
          </span>
        )}
      </p>
      <p style={{ color: "#888" }}>(지도 + 챗봇은 Phase 2에서 구현됩니다)</p>
      <button onClick={logout} style={{ marginTop: 16 }}>
        로그아웃
      </button>
    </div>
  );
}
