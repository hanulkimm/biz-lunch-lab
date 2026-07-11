// 방 꾸미기 API — 카탈로그 / 내 방 / 구매 / 레이아웃 저장.
import client from "./client";

export const getCatalog = () => client.get("/api/room/catalog").then((r) => r.data);
export const getMyRoom = () => client.get("/api/room/me").then((r) => r.data);
export const buyItem = (item_id) =>
  client.post("/api/room/buy", { item_id }).then((r) => r.data);
export const saveLayout = (layout) =>
  client.put("/api/room/layout", { layout }).then((r) => r.data);
