// 식당/검색 관련 API 호출.
import client from "./client";

export const searchKakao = (query) =>
  client
    .get("/api/restaurants/kakao/search", { params: { query } })
    .then((r) => r.data);

export const getRestaurants = () =>
  client.get("/api/restaurants").then((r) => r.data);

export const getRestaurant = (id) =>
  client.get(`/api/restaurants/${id}`).then((r) => r.data);

export const getRoulette = (category) =>
  client.get("/api/restaurants/roulette", { params: { category } }).then((r) => r.data);
