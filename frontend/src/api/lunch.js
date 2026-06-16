// 랜덤 런치 관련 API 호출.
import client from "./client";

// ─── 회차 ───
export const getCurrentRound = () =>
  client.get("/api/lunch/rounds").then((r) => r.data);

export const createRound = (data) =>
  client.post("/api/lunch/rounds", data).then((r) => r.data);

export const setRoundStatus = (roundId, status) =>
  client.patch(`/api/lunch/rounds/${roundId}/status`, { status }).then((r) => r.data);

// ─── 신청 ───
export const applyLunch = (data) =>
  client.post("/api/lunch/apply", data).then((r) => r.data);

export const cancelLunch = (applicationId) =>
  client.delete(`/api/lunch/apply/${applicationId}`).then((r) => r.data);

// ─── 매칭 / 결과 ───
export const runMatch = (roundId) =>
  client.post("/api/lunch/match", null, { params: { round_id: roundId } }).then((r) => r.data);

export const getResult = (roundId) =>
  client.get(`/api/lunch/result/${roundId}`).then((r) => r.data);
