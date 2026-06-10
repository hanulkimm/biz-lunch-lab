// 회원가입 — 담당 선택 → 팀 선택 → 이름 + 4자리 PIN (확인 포함).
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getDepartments, getTeams, signup } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import "./auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);

  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
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
    if (pin !== pinConfirm) {
      setError("PIN이 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const { token, user } = await signup({ name, team_id: teamId, pin });
      loginSuccess(token, user);
      navigate("/map");
    } catch (err) {
      setError(err.response?.data?.detail || "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1 className="auth-title">🍱 Biz Lunch Lab</h1>
        <p className="auth-sub">회원가입</p>

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

        <label>PIN (숫자 4자리)</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
        />

        <label>PIN 확인</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
        />

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "가입 중…" : "회원가입"}
        </button>

        <p className="auth-foot">
          이미 계정이 있으신가요? <Link to="/">로그인</Link>
        </p>
      </form>
    </div>
  );
}
