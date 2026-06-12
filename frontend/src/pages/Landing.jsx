// 메인 랜딩 — 영상 배경 위 동물의 숲 톤 히어로. 로그인/회원가입 진입.
import { Link } from "react-router-dom";

import "./landing-hero.css";

export default function Landing() {
  return (
    <div className="home">
      <video
        className="home-video"
        src="/landing-bg-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="home-scrim" />

      <div className="home-content">
        <div className="home-brand">
          <span className="leaf-logo" aria-hidden="true" />
          <span>비즈런치랩</span>
        </div>

        <span className="home-badge">광화문 점심 무인도에 어서 오세요</span>

        <h1 className="home-title">
          오늘 점심,
          <br />
          어디로 떠나볼까?
        </h1>

        <p className="home-desc">
          동료들이 발견한 맛집을 지도에 모으고, 별점과 태그로 기록하고,
          랜덤 런치로 같이 떠나는 우리 본부의 점심 섬.
        </p>

        <div className="home-cta">
          <Link to="/login" className="btn-leaf">
            🗺️ 마을 입장하기
          </Link>
          <Link to="/signup" className="btn-ghost">
            주민 등록
          </Link>
        </div>
      </div>

      <div className="home-foot">🍱 비즈런치랩 · 광화문 점심 무인도</div>
    </div>
  );
}
