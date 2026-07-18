// 모바일 화면(≤640px) 여부 — 배경 영상 교체 등 JS 분기용 공용 훅.
import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 640px)";

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
