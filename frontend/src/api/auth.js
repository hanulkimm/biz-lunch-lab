// 인증/조직 관련 API 호출.
import client from "./client";

export const getDepartments = () =>
  client.get("/api/departments").then((r) => r.data);

export const getTeams = (departmentId) =>
  client.get(`/api/departments/${departmentId}/teams`).then((r) => r.data);

export const signup = (data) =>
  client.post("/api/auth/signup", data).then((r) => r.data);

export const login = (data) =>
  client.post("/api/auth/login", data).then((r) => r.data);

export const getMe = () => client.get("/api/auth/me").then((r) => r.data);
