// 리뷰 작성 — 동물의 숲 단계 카드: 가게 선택 → 별점 → 태그 → 한마디.
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Star, Utensils } from "lucide-react";

import { searchKakao } from "../api/restaurants";
import { createReview, getTags } from "../api/reviews";
import Spinner from "../components/common/Spinner";
import "./review.css";

export default function ReviewWrite() {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false); // 검색을 한 번이라도 했는지(빈 결과 안내용)
  // 지도에서 "이 가게 리뷰 남기기"로 넘어온 경우 가게가 미리 선택됨
  const [place, setPlace] = useState(location.state?.place || null);

  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [awarded, setAwarded] = useState(null); // 리뷰 보상 나뭇잎 (연출용)

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
    setSearched(true);
    try {
      setResults(await searchKakao(query));
    } catch {
      setResults([]);
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
    if (!place) return setError("가게를 먼저 골라주세요.");
    if (!rating) return setError("별점을 콕 찍어주세요.");
    setSubmitting(true);
    try {
      const res = await createReview({ place, rating, comment, tag_ids: selectedTags });
      if (res.leaves_awarded > 0) {
        // 나뭇잎 보상 연출을 잠깐 보여주고 이동
        setAwarded(res.leaves_awarded);
        setTimeout(() => navigate("/map"), 1600);
      } else {
        navigate("/map");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "기록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  const RATING_LABEL = ["", "별로예요", "그저 그래요", "괜찮아요", "맛있어요!", "최고예요!"];

  return (
    <div className="rw-page">
      <header className="rw-header">
        <button className="rw-back" onClick={() => navigate("/map")}>
          <ArrowLeft size={15} /> 지도
        </button>
        <h1>맛집 기록하기</h1>
      </header>

      <div className="rw-content">
        {/* 1. 가게 */}
        <section className="step">
          <div className="step-head">
            <span className="step-num">1</span>
            <span className="step-title">어느 가게였나요?</span>
          </div>
          {place ? (
            <div className="picked">
              <div className="picked-info">
                <div className="picked-ico"><Utensils size={18} /></div>
                <div>
                  <div className="picked-name">{place.name}</div>
                  <div className="picked-cat">{place.category}</div>
                </div>
              </div>
              <button className="change" onClick={() => setPlace(null)}>변경</button>
            </div>
          ) : (
            <>
              <form className="rw-search" onSubmit={onSearch}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="가게 이름 검색 (광화문 권역)"
                />
                <button type="submit" disabled={searching}>
                  {searching ? <><Spinner size={15} /> 찾는 중…</> : "검색"}
                </button>
              </form>
              <div className="rw-results">
                {searching ? (
                  <div className="rw-results-state"><Spinner size={18} /> 가게를 찾는 중…</div>
                ) : searched && results.length === 0 ? (
                  <div className="rw-results-state">
                    검색 결과가 없어요 🌱<br />다른 이름으로 검색해보세요.
                  </div>
                ) : (
                  results.map((r) => (
                    <button key={r.kakao_place_id} className="result" onClick={() => setPlace(r)}>
                      <b>{r.name}</b>
                      <span>{r.category}</span>
                      <span>{r.road_address || r.address}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        {/* 2. 별점 */}
        <section className="step">
          <div className="step-head">
            <span className="step-num">2</span>
            <span className="step-title">별점을 콕!</span>
          </div>
          <div className="stars-pick">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n}점`}>
                <Star size={38} fill={n <= rating ? "currentColor" : "none"}
                      color={n <= rating ? "var(--star)" : "#e4d6b5"} />
              </button>
            ))}
            {rating > 0 && <span className="score">{rating.toFixed(1)}</span>}
            {rating > 0 && (
              <span style={{ marginLeft: 6, fontSize: 13, color: "var(--muted)" }}>
                {RATING_LABEL[rating]}
              </span>
            )}
          </div>
        </section>

        {/* 3. 태그 */}
        <section className="step">
          <div className="step-head">
            <span className="step-num">3</span>
            <span className="step-title">어떤 점이 좋았어요?</span>
            <span className="step-opt">선택</span>
          </div>
          {Object.entries(tagsByCategory).map(([cat, list]) => (
            <div key={cat} className="tag-group">
              <div className="tag-cat">{cat}</div>
              <div className="tag-list">
                {list.map((t) => {
                  const on = selectedTags.includes(t.id);
                  return (
                    <button key={t.id} className={on ? "chip on" : "chip"} onClick={() => toggleTag(t.id)}>
                      {on && <Check size={14} />} {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* 4. 한마디 */}
        <section className="step">
          <div className="step-head">
            <span className="step-num">4</span>
            <span className="step-title">한마디 남기기</span>
            <span className="step-opt">선택</span>
          </div>
          <div className="rw-comment">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="어떤 점이 좋았는지 동료들에게 알려주세요!"
              rows={4}
            />
            <div className="rw-count">{comment.length} / 300</div>
          </div>
        </section>

        {error && <p className="rw-error">{error}</p>}

        <button className="btn-leaf rw-submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? <><Spinner size={20} /> 기록하는 중…</> : "섬에 기록하기"}
        </button>
      </div>

      {/* 나뭇잎 보상 연출 */}
      {awarded && (
        <div className="rw-award-bg">
          <div className="rw-award">
            <div className="leaf-burst">🍃</div>
            <h3>+{awarded}잎 획득!</h3>
            <p>기록 고마워요! 나뭇잎이 차곡차곡 쌓이고 있어요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
