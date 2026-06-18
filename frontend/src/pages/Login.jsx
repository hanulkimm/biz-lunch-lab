// 로그인 — 영상 배경 위 동물의 숲 톤 카드(우측). 주민 입도 수속.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getDepartments, getTeams, login } from "../api/auth";
import SelectField from "../components/common/SelectField";
import { useAuthStore } from "../store/authStore";
import "../components/common/selectfield.css";
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
      <div className="login-wrap">
        <div className="login-frame">
          <div className="login-sea" />
          <div className="login-screen">
            <img className="login-bg" src="/login_bg.png" alt="" />
            <div className="login-scrim" />

            <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <img className="brand-logo" src="/kt_logo.png" alt="KT" />
          <span>BizLunchLab</span>
        </div>

        <h1 className="login-title">주민 입도 수속</h1>
        <p className="login-sub">담당·팀·이름과 PIN 4자리로 마을에 들어와요.</p>

        <label>담당</label>
        <SelectField
          value={deptId}
          onChange={setDeptId}
          placeholder="담당 선택"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
        />

        <label>팀</label>
        <SelectField
          value={teamId}
          onChange={setTeamId}
          placeholder="팀 선택"
          disabled={!deptId}
          options={teams.map((t) => ({ value: t.id, label: t.name }))}
        />

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
        </div>
      </div>
    </div>
  );
}
