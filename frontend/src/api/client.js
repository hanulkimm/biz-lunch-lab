// 공용 axios 인스턴스 — baseURL + JWT 토큰 자동 주입 + 401 처리 + 콜드스타트 재시도.
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  // Render 무료 플랜은 잠든 서버를 깨우는 데 시간이 걸리므로 넉넉히 대기.
  timeout: 60000,
});

// 요청마다 localStorage 토큰을 Authorization 헤더에 추가
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 콜드스타트(Render 무료 플랜) 대응: 서버가 잠들었다 깨는 동안 발생하는
// 네트워크 오류·타임아웃·502/503/504는 잠시 후 자동 재시도한다.
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config;
    const status = err.response?.status;

    // 401(토큰 만료/무효) → 토큰 제거 후 로그인으로
    if (status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
      return Promise.reject(err);
    }

    // 콜드스타트로 보이는 오류만 재시도 (응답 없음 = 네트워크/타임아웃, 또는 502/503/504)
    const isColdStart = !err.response || [502, 503, 504].includes(status);
    if (config && isColdStart) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      if (config.__retryCount <= MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        return client(config);
      }
    }

    return Promise.reject(err);
  }
);

export default client;
