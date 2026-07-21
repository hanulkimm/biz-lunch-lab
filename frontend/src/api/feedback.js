// 건의 창구 API.
import axios from "axios";

import client from "./client";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// anonymous=true면 토큰 없이 보내 백엔드가 작성자 정보 없이 저장(get_optional_user→None).
// false면 로그인 토큰이 실려 실명으로 전달된다.
export const sendFeedback = (content, anonymous = false) =>
  anonymous
    ? axios.post(`${BASE}/api/feedback`, { content }).then((r) => r.data)
    : client.post("/api/feedback", { content }).then((r) => r.data);

// ─── 관리자 전용 ───
export const getFeedback = () => client.get("/api/feedback").then((r) => r.data);

export const markFeedbackRead = (id) =>
  client.patch(`/api/feedback/${id}/read`).then((r) => r.data);

export const deleteFeedback = (id) =>
  client.delete(`/api/feedback/${id}`).then((r) => r.data);
