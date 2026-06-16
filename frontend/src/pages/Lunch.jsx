// 랜덤 런치 — 회차 신청 + 매칭 결과. 관리자는 회차 생성/마감/매칭 실행 컨트롤이 추가로 보임.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, MapPin, Sparkles, UsersRound, X } from "lucide-react";

import {
  applyLunch,
  cancelLunch,
  createRound,
  getCurrentRound,
  getResult,
  runMatch,
  setRoundStatus,
} from "../api/lunch";
import { useAuthStore } from "../store/authStore";
import AppHeader from "../components/common/AppHeader";
import "./lunch.css";

const FOODS = ["한식", "일식", "중식", "양식", "분식", "고기", "면류", "카페"];
const MOODS = ["상관없음", "조용한 분위기", "활기찬 분위기"];

export default function Lunch() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = !!user?.is_admin;

  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(null);
  const [myApp, setMyApp] = useState(null);
  const [count, setCount] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  // 신청 폼 상태
  const [prefs, setPrefs] = useState([]);
  const [exclusions, setExclusions] = useState("");
  const [mood, setMood] = useState("상관없음");

  // 관리자: 회차 생성 폼
  const [newTitle, setNewTitle] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCurrentRound();
      setRound(data.round);
      setMyApp(data.my_application);
      setCount(data.count);
      if (data.my_application) {
        setPrefs(data.my_application.food_preferences || []);
        setExclusions(data.my_application.food_exclusions || "");
        setMood(data.my_application.atmosphere_pref || "상관없음");
      }
      if (data.round?.status === "matched") {
        setResult(await getResult(data.round.id));
      } else {
        setResult(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePref = (f) =>
    setPrefs((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  const submitApply = async () => {
    setBusy(true);
    try {
      const res = await applyLunch({
        round_id: round.id,
        food_preferences: prefs,
        food_exclusions: exclusions.trim() || null,
        atmosphere_pref: mood,
      });
      setMyApp(res.application);
      setCount(res.count);
    } finally {
      setBusy(false);
    }
  };

  const submitCancel = async () => {
    if (!myApp) return;
    setBusy(true);
    try {
      const res = await cancelLunch(myApp.id);
      setMyApp(null);
      setCount(res.count);
    } finally {
      setBusy(false);
    }
  };

  // ─── 관리자 액션 ───
  const adminCreate = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await createRound({ title: newTitle.trim() });
      setNewTitle("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const adminClose = async () => {
    setBusy(true);
    try {
      await setRoundStatus(round.id, "closed");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const adminReopen = async () => {
    setBusy(true);
    try {
      await setRoundStatus(round.id, "open");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const adminMatch = async () => {
    setBusy(true);
    try {
      const res = await runMatch(round.id);
      setResult(res);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "매칭에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const myId = user?.id;
  const isMyGroup = (g) => g.members.some((m) => m.id === myId);

  return (
    <div className="gw-page">
      <AppHeader active="lunch" />
      <div className="ln">
        <div className="ln-head">
          <h1>
            <UsersRound size={24} /> 랜덤 런치
          </h1>
          <p>취향을 입력하고 신청하면, 또리가 비슷한 사람끼리 묶어 점심 친구를 매칭해줘요.</p>
        </div>

        {loading ? (
          <div className="ln-loading">
            <Loader2 className="spin" size={28} /> 불러오는 중…
          </div>
        ) : !round ? (
          <NoRound
            isAdmin={isAdmin}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            onCreate={adminCreate}
            busy={busy}
          />
        ) : (
          <>
            {/* 회차 카드 */}
            <div className="ln-round">
              <div className="ln-round-top">
                <span className={`ln-status ln-status-${round.status}`}>
                  {round.status === "open"
                    ? "신청 받는 중"
                    : round.status === "closed"
                    ? "신청 마감"
                    : "매칭 완료"}
                </span>
                <span className="ln-count">신청 {count}명</span>
              </div>
              <h2>{round.title}</h2>
            </div>

            {/* 매칭 결과 */}
            {round.status === "matched" && result ? (
              <div className="ln-result">
                {result.groups.map((g) => (
                  <div
                    key={g.group_no}
                    className={isMyGroup(g) ? "ln-group mine" : "ln-group"}
                  >
                    <div className="ln-group-head">
                      <span className="ln-group-no">그룹 {g.group_no}</span>
                      {isMyGroup(g) && <span className="ln-mine-badge">내 그룹 🎉</span>}
                    </div>
                    <div className="ln-members">
                      {g.members.map((m) => (
                        <span
                          key={m.id}
                          className={m.id === myId ? "ln-chip me" : "ln-chip"}
                        >
                          {m.name}
                          {m.team ? <small>{m.team}</small> : null}
                        </span>
                      ))}
                    </div>
                    {g.restaurants.length > 0 && (
                      <div className="ln-recs">
                        <div className="ln-recs-title">
                          <Sparkles size={14} /> 추천 식당
                        </div>
                        {g.restaurants.map((r) => (
                          <button
                            key={r.id}
                            className="ln-rec"
                            onClick={() => navigate("/map", { state: { focusId: r.id } })}
                          >
                            <div className="ln-rec-main">
                              <span className="ln-rec-name">{r.name}</span>
                              {r.category && <span className="ln-rec-cat">{r.category}</span>}
                              <MapPin size={14} className="ln-rec-pin" />
                            </div>
                            {r.reason && <p className="ln-rec-reason">{r.reason}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : myApp ? (
              /* 신청 완료 상태 */
              <div className="ln-applied">
                <div className="ln-applied-badge">
                  <Check size={18} /> 신청 완료!
                </div>
                <dl className="ln-applied-info">
                  <div>
                    <dt>선호 음식</dt>
                    <dd>{myApp.food_preferences?.join(", ") || "상관없음"}</dd>
                  </div>
                  <div>
                    <dt>기피 음식</dt>
                    <dd>{myApp.food_exclusions || "없음"}</dd>
                  </div>
                  <div>
                    <dt>분위기</dt>
                    <dd>{myApp.atmosphere_pref}</dd>
                  </div>
                </dl>
                <p className="ln-applied-note">
                  매칭이 완료되면 이 화면에서 그룹과 추천 식당을 확인할 수 있어요.
                </p>
                {round.status === "open" && (
                  <button className="ln-cancel" onClick={submitCancel} disabled={busy}>
                    <X size={16} /> 신청 취소
                  </button>
                )}
              </div>
            ) : round.status === "open" ? (
              /* 신청 폼 */
              <div className="ln-form">
                <label className="ln-label">선호하는 음식 (복수 선택)</label>
                <div className="ln-foods">
                  {FOODS.map((f) => (
                    <button
                      key={f}
                      className={prefs.includes(f) ? "ln-food on" : "ln-food"}
                      onClick={() => togglePref(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <label className="ln-label">못 먹거나 피하고 싶은 음식</label>
                <input
                  className="ln-input"
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="예: 해산물, 매운 음식 (없으면 비워두세요)"
                />

                <label className="ln-label">선호 분위기</label>
                <div className="ln-moods">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      className={mood === m ? "ln-mood on" : "ln-mood"}
                      onClick={() => setMood(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <button className="btn-leaf ln-submit" onClick={submitApply} disabled={busy}>
                  {busy ? <Loader2 className="spin" size={16} /> : <UsersRound size={16} />}
                  런치 신청하기
                </button>
              </div>
            ) : (
              /* closed, 신청 안 함 */
              <div className="ln-closed-note">
                신청이 마감되었어요. 매칭 결과를 기다려 주세요! 🌿
              </div>
            )}

            {/* 관리자 컨트롤 */}
            {isAdmin && (
              <div className="ln-admin">
                <div className="ln-admin-title">🛠️ 관리자</div>
                <div className="ln-admin-actions">
                  {round.status === "open" && (
                    <button className="ln-admin-btn" onClick={adminClose} disabled={busy}>
                      신청 마감
                    </button>
                  )}
                  {round.status === "closed" && (
                    <button className="ln-admin-btn" onClick={adminReopen} disabled={busy}>
                      신청 재개
                    </button>
                  )}
                  {round.status !== "matched" && (
                    <button
                      className="ln-admin-btn primary"
                      onClick={adminMatch}
                      disabled={busy || count < 2}
                    >
                      {busy ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
                      매칭 실행 (Claude)
                    </button>
                  )}
                  {round.status === "matched" && (
                    <button className="ln-admin-btn" onClick={adminMatch} disabled={busy}>
                      매칭 다시 실행
                    </button>
                  )}
                </div>
                {count < 2 && round.status !== "matched" && (
                  <p className="ln-admin-hint">신청자가 2명 이상이면 매칭할 수 있어요.</p>
                )}
                <div className="ln-admin-new">
                  <input
                    className="ln-input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="새 회차 제목 (예: 6월 셋째 주 랜덤 런치)"
                  />
                  <button className="ln-admin-btn" onClick={adminCreate} disabled={busy || !newTitle.trim()}>
                    새 회차 열기
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NoRound({ isAdmin, newTitle, setNewTitle, onCreate, busy }) {
  return (
    <div className="ln-empty">
      <div className="ln-empty-emoji">🍱</div>
      <h2>아직 열린 회차가 없어요</h2>
      <p>다음 랜덤 런치 회차가 열리면 여기에서 신청할 수 있어요.</p>
      {isAdmin && (
        <div className="ln-admin-new center">
          <input
            className="ln-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="회차 제목 (예: 6월 셋째 주 랜덤 런치)"
          />
          <button className="btn-leaf" onClick={onCreate} disabled={busy || !newTitle.trim()}>
            첫 회차 열기
          </button>
        </div>
      )}
    </div>
  );
}
