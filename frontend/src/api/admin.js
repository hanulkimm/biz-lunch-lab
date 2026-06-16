// 관리자 전용 API 호출.
import client from "./client";

export const getUsers = () => client.get("/api/admin/users").then((r) => r.data);

export const resetPin = (userId, pin) =>
  client.patch(`/api/admin/users/${userId}/pin`, { pin }).then((r) => r.data);

export const getAllRounds = () =>
  client.get("/api/admin/rounds").then((r) => r.data);
