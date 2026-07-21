// 닮은꼴 주민 매칭 API.
import client from "./client";

// 사진(선택) + 퀴즈 답변 → 매칭 결과. Vision 분석이라 넉넉히 대기.
export const matchVillager = (quiz, photoFile) => {
  const fd = new FormData();
  fd.append("quiz", JSON.stringify(quiz));
  if (photoFile) fd.append("photo", photoFile);
  return client
    .post("/api/villager/match", fd, { timeout: 90000 })
    .then((r) => r.data);
};

export const saveVillagerProfile = (villager) =>
  client.put("/api/villager/profile", { villager }).then((r) => r.data);

export const clearVillagerProfile = () =>
  client.delete("/api/villager/profile").then((r) => r.data);

// 내 주민의 배경 없는 전신 이미지 URL (낚시터 연출용).
// 백엔드가 프록시 경로(/api/villager/image/{name})를 주면 API 서버 주소를 붙인다
// — 외부 이미지 CDN이 사내망에서 차단되는 문제 대응.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getVillagerRender = () =>
  client.get("/api/villager/render").then((r) => {
    const url = r.data.image_url;
    return { image_url: url && url.startsWith("/api/") ? `${BASE}${url}` : url };
  });
