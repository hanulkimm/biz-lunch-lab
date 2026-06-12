// 랜딩 + 로그인 합체 — 동물의 숲 배경 이미지 위 오른쪽 로그인 카드.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getDepartments, getTeams, login } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import "./landing.css";

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
      <form className="lp-card" onSubmit={onSubmit}>
        <h2 className="lp-card-title">🍱 Biz Lunch Lab</h2>
        <p className="lp-card-sub">기업사업본부 광화문 맛집 탐험 &amp; 랜덤 런치</p>

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
  );
}
