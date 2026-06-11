// 리뷰 관련 API 호출.
import client from "./client";

export const getTags = () => client.get("/api/tags").then((r) => r.data);

export const createReview = (data) =>
  client.post("/api/reviews", data).then((r) => r.data);

export const updateReview = (id, data) =>
  client.put(`/api/reviews/${id}`, data).then((r) => r.data);

export const deleteReview = (id) =>
  client.delete(`/api/reviews/${id}`).then((r) => r.data);

export const getMyReviews = () =>
  client.get("/api/reviews/my").then((r) => r.data);
