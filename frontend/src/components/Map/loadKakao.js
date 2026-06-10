// 카카오 지도 JS SDK를 1회만 동적 로드한다. (autoload=false → maps.load 콜백으로 준비 완료)
let promise = null;

export function loadKakao() {
  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_KAKAO_MAP_KEY;
    if (!key) {
      reject(new Error("VITE_KAKAO_MAP_KEY 가 설정되지 않았습니다."));
      return;
    }
    // 이미 로드된 경우
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve(window.kakao));
      return;
    }
    const script = document.createElement("script");
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => reject(new Error("카카오 지도 SDK 로드 실패"));
    document.head.appendChild(script);
  });

  return promise;
}
