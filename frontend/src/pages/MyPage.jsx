// 마이페이지 — 내가 남긴 리뷰 목록 + 수정/삭제.
import { useEffect, useMemo, useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";

import { deleteReview, getMyReviews, getTags, updateReview } from "../api/reviews";
import AppHeader from "../components/common/AppHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Spinner from "../components/common/Spinner";
import "./mypage.css";

function Stars({ value = 0, size = 16 }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size}
          fill={n <= value ? "currentColor" : "none"}
          color={n <= value ? "var(--star)" : "#e4d6b5"} />
      ))}
    </span>
  );
}

function EditModal({ review, tags, onClose, onSaved }) {
  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment || "");
  const [selected, setSelected] = useState(
    (review.review_tags || []).map((rt) => rt.tags?.id).filter(Boolean)
  );
  const [saving, setSaving] = useState(false);

  const byCat = useMemo(() => {
    const g = {};
    tags.forEach((t) => (g[t.category] ??= []).push(t));
    return g;
  }, [tags]);

  const toggle = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    setSaving(true);
    try {
      await updateReview(review.id, { rating, comment, tag_ids: selected });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mp-modal-bg" onClick={onClose}>
      <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
        <h2>기록 고치기</h2>
        <p className="target">{review.restaurants?.name}</p>

        <div className="mp-label">별점</div>
        <div className="mp-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} aria-label={`${n}점`}>
              <Star size={32} fill={n <= rating ? "currentColor" : "none"}
                color={n <= rating ? "var(--star)" : "#e4d6b5"} />
            </button>
          ))}
        </div>

        <div className="mp-label">태그</div>
        {Object.entries(byCat).map(([cat, list]) => (
          <div key={cat}>
            <div className="mp-tagcat">{cat}</div>
            <div className="mp-chips">
              {list.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <button key={t.id} className={on ? "mp-chip on" : "mp-chip"} onClick={() => toggle(t.id)}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mp-label">한마디</div>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value.slice(0, 300))} />

        <div className="mp-modal-actions">
          <button className="mp-cancel" onClick={onClose}>취소</button>
          <button className="btn-leaf" onClick={save} disabled={saving}>
            {saving ? <><Spinner size={18} /> 저장 중…</> : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyPage() {
  const [reviews, setReviews] = useState(null);
  const [tags, setTags] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // 삭제 확인 대상 리뷰
  const [deleting, setDeleting] = useState(false);

  const load = () => getMyReviews().then(setReviews).catch(() => setReviews([]));

  useEffect(() => {
    load();
    getTags().then(setTags).catch(() => {});
  }, []);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteReview(confirmDel.id);
      setReviews((prev) => prev.filter((x) => x.id !== confirmDel.id));
      setConfirmDel(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="gw-page">
      <AppHeader active="mypage" />
      <div className="mp">
        <h1>👤 마이페이지</h1>
        <p className="mp-sub">
          {reviews == null ? "불러오는 중…" : `내가 남긴 기록 ${reviews.length}개`}
        </p>

        {reviews?.length === 0 && (
          <div className="mp-empty">
            <div className="e">🌱</div>
            <p>아직 남긴 기록이 없어요.<br />마음에 든 맛집을 기록해보세요!</p>
          </div>
        )}

        {reviews?.map((r) => (
          <div key={r.id} className="mp-card">
            <div className="mp-card-top">
              <div>
                {r.restaurants?.category && (
                  <span className="mp-cat">{r.restaurants.category.split(">").pop().trim()}</span>
                )}
                <div className="mp-name">{r.restaurants?.name}</div>
              </div>
              <span className="mp-date">{(r.created_at || "").slice(0, 10).replace(/-/g, ".")}</span>
            </div>
            <div className="mp-rate"><Stars value={r.rating} /></div>
            {(r.review_tags || []).length > 0 && (
              <div className="mp-tags">
                {r.review_tags.map((rt) => (
                  <span key={rt.tags?.id} className="tag">{rt.tags?.name}</span>
                ))}
              </div>
            )}
            {r.comment && <p className="mp-comment">{r.comment}</p>}
            <div className="mp-actions">
              <button className="mp-btn" onClick={() => setEditing(r)}><Pencil size={14} /> 수정</button>
              <button className="mp-btn danger" onClick={() => setConfirmDel(r)}><Trash2 size={14} /> 삭제</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditModal
          review={editing}
          tags={tags}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="기록을 삭제할까요?"
          message={`'${confirmDel.restaurants?.name}'에 남긴 기록이 사라져요. 되돌릴 수 없어요.`}
          confirmText="삭제하기"
          cancelText="취소"
          danger
          loading={deleting}
          onConfirm={doDelete}
          onCancel={() => !deleting && setConfirmDel(null)}
        />
      )}
    </div>
  );
}
