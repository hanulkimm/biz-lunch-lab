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

// 카카오 place_id로 식당 상세+리뷰 조회 (리뷰 없으면 null) — 지도 검색 선택용.
export const getRestaurantByKakao = (kakaoPlaceId) =>
  client.get(`/api/restaurants/by-kakao/${kakaoPlaceId}`).then((r) => r.data);

export const getRoulette = (category) =>
  client.get("/api/restaurants/roulette", { params: { category } }).then((r) => r.data);
