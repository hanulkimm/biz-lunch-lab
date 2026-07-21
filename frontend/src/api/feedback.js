// 건의 창구 API.
import client from "./client";

export const sendFeedback = (content) =>
  client.post("/api/feedback", { content }).then((r) => r.data);

// ─── 관리자 전용 ───
export const getFeedback = () => client.get("/api/feedback").then((r) => r.data);

export const markFeedbackRead = (id) =>
  client.patch(`/api/feedback/${id}/read`).then((r) => r.data);

export const deleteFeedback = (id) =>
  client.delete(`/api/feedback/${id}`).then((r) => r.data);
