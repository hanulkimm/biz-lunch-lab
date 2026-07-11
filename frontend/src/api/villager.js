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

// 내 주민의 배경 없는 전신 이미지 URL (낚시터 연출용)
export const getVillagerRender = () =>
  client.get("/api/villager/render").then((r) => r.data);
