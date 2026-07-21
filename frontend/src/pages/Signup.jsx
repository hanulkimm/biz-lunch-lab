// 회원가입 — 이름과 PIN 4자리만으로 가입. 조직정보는 가입 후 마이페이지에서.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signup } from "../api/auth";
import useIsMobile from "../hooks/useIsMobile";
import { useAuthStore } from "../store/authStore";
import "../components/common/selectfield.css";
import "./login.css";

export default function Signup() {
  const navigate = useNavigate();
  const loginSuccess = useAuthStore((s) => s.loginSuccess);
  const isMobile = useIsMobile();

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || pin.length !== 4) {
      setError("이름과 PIN 4자리를 입력해주세요.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("PIN이 일치하지 않습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const { token, user } = await signup({ name: name.trim(), pin });
      loginSuccess(token, user);
      navigate("/map");
    } catch (err) {
      setError(err.response?.data?.detail || "회원가입에 실패했습니다.");
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
            {isMobile ? (
              <img className="login-bg" src="/login-bg-mobile.jpeg" alt="" />
            ) : (
              <video
                className="login-bg"
                src="/login-bg.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
            )}
            <div className="login-scrim" />

            <Link to="/map" className="login-back">🗺️ 지도로 돌아가기</Link>

            <form className="login-card" onSubmit={onSubmit}>
              <div className="login-brand">
                <img className="brand-logo" src="/kt_logo.png" alt="KT" />
                <span>BizLunchLab</span>
              </div>

              <h1 className="login-title">주민 등록</h1>
              <p className="login-sub">이름과 PIN 4자리면 누구나 마을 주민이 되어요.</p>

              <label>이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="마을에서 쓸 이름"
                maxLength={50}
              />

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

              <label>PIN 확인</label>
              <input
                className="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="btn-leaf" disabled={submitting}>
                {submitting ? "가입 중…" : "주민 등록하기"}
              </button>

              <p className="login-foot">
                부문·본부·담당·팀은 가입 후 마이페이지에서 입력할 수 있어요.
              </p>
              <p className="login-foot">
                이미 주민이신가요? <Link to="/login">로그인</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
