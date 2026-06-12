// 로그인 — 영상 배경 위 동물의 숲 톤 카드(우측). 주민 입도 수속.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getDepartments, getTeams, login } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import "./login.css";

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
    <div className="login-page">
      <video className="login-video" src="/login-bg.mp4" autoPlay muted loop playsInline />
      <div className="login-scrim" />

      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <span className="leaf-logo" aria-hidden="true" />
          <span>비즈런치랩</span>
        </div>

        <h1 className="login-title">주민 입도 수속</h1>
        <p className="login-sub">담당·팀·이름과 PIN 4자리로 마을에 들어와요.</p>

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
          className="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn-leaf" disabled={submitting}>
          {submitting ? "입도 중…" : "입도하기"}
        </button>

        <p className="login-foot">
          아직 주민이 아니신가요? <Link to="/signup">주민 등록</Link>
        </p>
      </form>
    </div>
  );
}
