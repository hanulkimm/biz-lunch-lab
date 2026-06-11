// 리뷰 작성 — 카카오 검색으로 식당 선택 → 별점 + 태그 멀티선택 + 코멘트.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { searchKakao } from "../api/restaurants";
import { createReview, getTags } from "../api/reviews";
import "./review.css";

export default function ReviewWrite() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState(null);

  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTags().then(setTags).catch(() => {});
  }, []);

  const tagsByCategory = useMemo(() => {
    const grouped = {};
    tags.forEach((t) => (grouped[t.category] ??= []).push(t));
    return grouped;
  }, [tags]);

  const onSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await searchKakao(query));
    } finally {
      setSearching(false);
    }
  };

  const toggleTag = (id) =>
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const onSubmit = async () => {
    setError("");
    if (!place) return setError("식당을 먼저 선택해주세요.");
    if (!rating) return setError("별점을 선택해주세요.");
    setSubmitting(true);
    try {
      await createReview({ place, rating, comment, tag_ids: selectedTags });
      navigate("/map");
    } catch (err) {
      setError(err.response?.data?.detail || "리뷰 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-page">
      <header className="review-header">
        <button className="back" onClick={() => navigate("/map")}>
          ← 지도
        </button>
        <h1>리뷰 작성</h1>
      </header>

      <div className="review-content">
        {/* 1. 식당 선택 */}
        <section>
          <label className="section-label">1. 식당 선택</label>
          {place ? (
            <div className="picked">
              <div>
                <b>{place.name}</b>
                <span className="picked-cat">{place.category}</span>
              </div>
              <button className="change" onClick={() => setPlace(null)}>
                변경
              </button>
            </div>
          ) : (
            <>
              <form className="search-row" onSubmit={onSearch}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="식당 이름 검색 (광화문 권역)"
                />
                <button type="submit" disabled={searching}>
                  {searching ? "검색 중…" : "검색"}
                </button>
              </form>
              <div className="results">
                {results.map((r) => (
                  <button key={r.kakao_place_id} className="result" onClick={() => setPlace(r)}>
                    <b>{r.name}</b>
                    <span>{r.category}</span>
                    <span className="addr">{r.road_address || r.address}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 2. 별점 */}
        <section>
          <label className="section-label">2. 별점</label>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={n <= rating ? "star on" : "star"}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
        </section>

        {/* 3. 태그 */}
        <section>
          <label className="section-label">3. 태그 (선택)</label>
          {Object.entries(tagsByCategory).map(([cat, list]) => (
            <div key={cat} className="tag-group">
              <span className="tag-cat">{cat}</span>
              <div className="tag-list">
                {list.map((t) => (
                  <button
                    key={t.id}
                    className={selectedTags.includes(t.id) ? "tag-chip on" : "tag-chip"}
                    onClick={() => toggleTag(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* 4. 코멘트 */}
        <section>
          <label className="section-label">4. 코멘트 (선택)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="어떤 점이 좋았나요?"
            rows={4}
          />
        </section>

        {error && <p className="review-error">{error}</p>}

        <button className="submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? "등록 중…" : "리뷰 등록"}
        </button>
      </div>
    </div>
  );
}
