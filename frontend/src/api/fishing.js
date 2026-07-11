// 청계천 낚시터 API.
import client from "./client";

export const getPond = () => client.get("/api/fishing/pond").then((r) => r.data);
export const castLine = () => client.post("/api/fishing/cast").then((r) => r.data);
export const landFish = (token) =>
  client.post("/api/fishing/land", { token }).then((r) => r.data);
export const getCollection = () =>
  client.get("/api/fishing/collection").then((r) => r.data);
export const sellFish = (fish_id, count = 1) =>
  client.post("/api/fishing/sell", { fish_id, count }).then((r) => r.data);
