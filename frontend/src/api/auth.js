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

// 마이페이지 조직정보(부문·본부·담당·팀) 수정
export const updateProfile = (data) =>
  client.patch("/api/auth/me", data).then((r) => r.data);
