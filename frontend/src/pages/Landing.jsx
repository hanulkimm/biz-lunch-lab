// 메인 랜딩 — 민트 카드 안에 영상을 감싼 히어로(지도 페이지 톤). 로그인/회원가입 진입.
import { Link } from "react-router-dom";

import "./landing-hero.css";

export default function Landing() {
  return (
    <div className="home">
      <div className="home-wrap">
        <div className="home-frame">
          <div className="home-sea" />

          <div className="home-screen">
            <video
              className="home-video"
              src="/main-bg.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="home-scrim reveal" />

            <div className="home-content reveal">
              <div className="home-brand">
                <img className="brand-logo" src="/kt_logo.png" alt="KT" />
                <span>BizLunchLab</span>
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
          </div>
        </div>

        <div className="home-foot reveal">🍱 BizLunchLab · 광화문 점심 무인도</div>
      </div>
    </div>
  );
}
