// AI 챗봇 API 호출.
import client from "./client";

export const sendChat = (message, history) =>
  client.post("/api/chat", { message, history }).then((r) => r.data);
