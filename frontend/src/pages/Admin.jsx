// 관리자 화면 — 런치 회차 관리(생성/마감/재개/매칭) + 사용자 PIN 리셋.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Inbox, KeyRound, Loader2, Plus, Sparkles, Trash2, Users } from "lucide-react";

import { getAllRounds, getUsers, resetPin } from "../api/admin";
import { deleteFeedback, getFeedback, markFeedbackRead } from "../api/feedback";
import { createRound, runMatch, setRoundStatus } from "../api/lunch";
import AppHeader from "../components/common/AppHeader";
import "./admin.css";

const STATUS_LABEL = { open: "신청 중", closed: "마감", matched: "매칭 완료" };

export default function Admin() {
  const navigate = useNavigate();

  const [rounds, setRounds] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null); // 진행 중인 회차/유저 id
  const [newTitle, setNewTitle] = useState("");

  // PIN 리셋
  const [resetTarget, setResetTarget] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [resetDone, setResetDone] = useState(null); // 방금 리셋한 user id

  const load = async () => {
    setLoading(true);
    try {
      const [r, u, f] = await Promise.all([getAllRounds(), getUsers(), getFeedback()]);
      setRounds(r);
      setUsers(u);
      setFeedback(f);
    } finally {
      setLoading(false);
    }
  };

  const readFeedback = async (id) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, is_read: true } : f)));
    try {
      await markFeedbackRead(id);
    } catch {
      load();
    }
  };

  const removeFeedback = async (id) => {
    setFeedback((prev) => prev.filter((f) => f.id !== id));
    try {
      await deleteFeedback(id);
    } catch {
      load();
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createNew = async () => {
    if (!newTitle.trim()) return;
    setBusyId("new");
    try {
      await createRound({ title: newTitle.trim() });
      setNewTitle("");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (round, status) => {
    setBusyId(round.id);
    try {
      await setRoundStatus(round.id, status);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const doMatch = async (round) => {
    setBusyId(round.id);
    try {
      await runMatch(round.id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "매칭에 실패했어요.");
    } finally {
      setBusyId(null);
    }
  };

  const openReset = (user) => {
    setResetTarget(user.id);
    setNewPin("");
    setResetDone(null);
  };

  const submitReset = async (userId) => {
    if (!/^\d{4}$/.test(newPin)) return;
    setBusyId(userId);
    try {
      await resetPin(userId, newPin);
      setResetTarget(null);
      setResetDone(userId);
      setNewPin("");
    } catch (e) {
      alert(e?.response?.data?.detail || "PIN 리셋에 실패했어요.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="gw-page">
      <AppHeader active="admin" />
      <div className="adm">
        <div className="adm-head">
          <h1>🛠️ 관리자</h1>
          <p>랜덤 런치 회차를 관리하고, 구성원의 PIN을 재설정할 수 있어요.</p>
        </div>

        {loading ? (
          <div className="adm-loading">
            <Loader2 className="spin" size={28} /> 불러오는 중…
          </div>
        ) : (
          <>
            {/* ─── 회차 관리 ─── */}
            <section className="adm-card">
              <div className="adm-card-title">
                <Sparkles size={18} /> 런치 회차
              </div>

              <div className="adm-new">
                <input
                  className="adm-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="새 회차 제목 (예: 6월 넷째 주 랜덤 런치)"
                  onKeyDown={(e) => e.key === "Enter" && createNew()}
                />
                <button className="btn-leaf" onClick={createNew} disabled={busyId === "new" || !newTitle.trim()}>
                  {busyId === "new" ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                  회차 열기
                </button>
              </div>

              {rounds.length === 0 ? (
                <p className="adm-empty">아직 만든 회차가 없어요.</p>
              ) : (
                <ul className="adm-rounds">
                  {rounds.map((r) => {
                    const busy = busyId === r.id;
                    return (
                      <li key={r.id} className="adm-round">
                        <div className="adm-round-info">
                          <span className={`adm-badge st-${r.status}`}>
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                          <span className="adm-round-title">{r.title}</span>
                          <span className="adm-round-count">신청 {r.count}명</span>
                        </div>
                        <div className="adm-round-actions">
                          {r.status === "open" && (
                            <button className="adm-btn" onClick={() => changeStatus(r, "closed")} disabled={busy}>
                              마감
                            </button>
                          )}
                          {r.status === "closed" && (
                            <button className="adm-btn" onClick={() => changeStatus(r, "open")} disabled={busy}>
                              재개
                            </button>
                          )}
                          {r.status !== "matched" && (
                            <button
                              className="adm-btn primary"
                              onClick={() => doMatch(r)}
                              disabled={busy || r.count < 2}
                              title={r.count < 2 ? "신청자 2명 이상 필요" : ""}
                            >
                              {busy ? <Loader2 className="spin" size={14} /> : <Sparkles size={14} />}
                              매칭
                            </button>
                          )}
                          {r.status === "matched" && (
                            <>
                              <button className="adm-btn" onClick={() => doMatch(r)} disabled={busy}>
                                다시 매칭
                              </button>
                              <button className="adm-btn" onClick={() => navigate("/lunch")}>
                                결과 보기
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ─── 사용자 관리 ─── */}
            <section className="adm-card">
              <div className="adm-card-title">
                <Users size={18} /> 구성원 ({users.length}명)
              </div>
              <ul className="adm-users">
                {users.map((u) => {
                  const busy = busyId === u.id;
                  const editing = resetTarget === u.id;
                  return (
                    <li key={u.id} className="adm-user">
                      <div className="adm-user-info">
                        <span className="adm-user-name">
                          {u.name}
                          {u.is_admin && <span className="adm-admin-tag">관리자</span>}
                        </span>
                        <span className="adm-user-org">
                          {[u.department, u.team].filter(Boolean).join(" · ") || "소속 미입력"}
                        </span>
                      </div>
                      {editing ? (
                        <div className="adm-reset">
                          <input
                            className="adm-input pin"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="새 PIN"
                            inputMode="numeric"
                            maxLength={4}
                            autoFocus
                          />
                          <button
                            className="adm-btn primary"
                            onClick={() => submitReset(u.id)}
                            disabled={busy || !/^\d{4}$/.test(newPin)}
                          >
                            {busy ? <Loader2 className="spin" size={14} /> : "확인"}
                          </button>
                          <button className="adm-btn" onClick={() => setResetTarget(null)} disabled={busy}>
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="adm-user-actions">
                          {resetDone === u.id && <span className="adm-reset-ok">리셋 완료 ✓</span>}
                          <button className="adm-btn" onClick={() => openReset(u)}>
                            <KeyRound size={14} /> PIN 리셋
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* ─── 건의함 ─── */}
            <section className="adm-card">
              <div className="adm-card-title">
                <Inbox size={18} /> 건의함 ({feedback.filter((f) => !f.is_read).length}개 안 읽음)
              </div>
              {feedback.length === 0 ? (
                <p className="adm-empty">아직 들어온 건의가 없어요.</p>
              ) : (
                <ul className="adm-feedback">
                  {feedback.map((f) => (
                    <li key={f.id} className={f.is_read ? "adm-fb read" : "adm-fb"}>
                      <div className="adm-fb-top">
                        <span className="adm-fb-who">
                          {f.author_name || "익명"}
                          {!f.is_read && <span className="adm-fb-new">NEW</span>}
                        </span>
                        <span className="adm-fb-date">
                          {(f.created_at || "").slice(0, 10).replace(/-/g, ".")}
                        </span>
                      </div>
                      <p className="adm-fb-content">{f.content}</p>
                      <div className="adm-fb-actions">
                        {!f.is_read && (
                          <button className="adm-btn" onClick={() => readFeedback(f.id)}>
                            <Check size={14} /> 읽음
                          </button>
                        )}
                        <button className="adm-btn danger" onClick={() => removeFeedback(f.id)}>
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
