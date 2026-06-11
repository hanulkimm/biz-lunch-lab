// 랜딩 + 로그인 합체 — 동물의 숲 풍경 위에 로그인 카드.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getDepartments, getTeams, login } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import "./landing.css";

function Tree({ style }) {
  return (
    <svg className="lp-deco" style={style} width="110" height="150" viewBox="0 0 110 150">
      <rect x="48" y="100" width="14" height="44" rx="6" fill="#8a5a33" />
      <ellipse cx="55" cy="92" rx="34" ry="24" fill="#3f9442" />
      <ellipse cx="55" cy="66" rx="40" ry="28" fill="#4caf50" />
      <ellipse cx="55" cy="38" rx="30" ry="24" fill="#5fbf63" />
    </svg>
  );
}

function Tent({ style }) {
  return (
    <svg className="lp-deco" style={style} width="150" height="110" viewBox="0 0 150 110">
      <path d="M75 8 L142 102 L8 102 Z" fill="#f5c542" />
      <path d="M75 8 L108 102 L42 102 Z" fill="#ffe27a" />
      <path d="M75 8 L88 102 L62 102 Z" fill="#e8a020" />
      <rect x="4" y="100" width="142" height="8" rx="4" fill="#4e8c2b" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => setError("담당 목록을 불러오지 못했습니다."));
  }, []);

  useEffect(() => {
    setTeamId("");
    setTeams([]);
    if (deptId) getTeams(deptId).then(setTeams).catch(() => {});
  }, [deptId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!teamId || !name || pin.length !== 4) {
      setError("모든 항목을 입력해주세요. (PIN은 4자리)");
      return;
    }
    setSubmitting(true);
    try {
      const { token, user } = await login({ name, team_id: teamId, pin });
      loginSuccess(token, user);
      navigate("/map");
    } catch (err) {
      setError(err.response?.data?.detail || "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lp">
      <div className="lp-sun" />
      <div className="lp-cloud c1" />
      <div className="lp-cloud c2" />
      <div className="lp-cloud c3" />
      <div className="lp-hill h1" />
      <div className="lp-hill h2" />

      <Tree style={{ left: "4%", bottom: "60px" }} />
      <Tree style={{ left: "13%", bottom: "110px", transform: "scale(0.7)" }} />
      <Tree style={{ right: "5%", bottom: "80px", transform: "scale(0.85)" }} />
      <Tent style={{ right: "14%", bottom: "52px" }} />

      <div className="lp-main">
        <div className="lp-logo">
          <span className="lp-tag">모여봐요</span>
          <div className="lp-bubbles">
            <span className="b1">비</span>
            <span className="b2">즈</span>
            <span className="b3">런</span>
            <span className="b4">치</span>
            <span className="b5">랩</span>
          </div>
          <p className="lp-sub">기업사업본부 광화문 맛집 탐험 &amp; 랜덤 런치</p>
        </div>

        <form className="lp-card" onSubmit={onSubmit}>
          <h2 className="lp-card-title">🍱 마을에 입장하기</h2>
          <p className="lp-card-sub">소속과 이름, PIN으로 로그인해요</p>

          <label>담당</label>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
            <option value="">담당 선택</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <label>팀</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!deptId}>
            <option value="">팀 선택</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <label>이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />

          <label>PIN (4자리)</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
          />

          {error && <p className="lp-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "입장 중…" : "입장하기"}
          </button>

          <p className="lp-foot">
            처음이신가요? <Link to="/signup">주민등록 하러 가기</Link>
          </p>
        </form>
      </div>

      <div className="lp-grass" />
    </div>
  );
}
