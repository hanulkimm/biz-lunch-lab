// 메인 랜딩 — 민트 카드 안에 영상을 감싼 히어로(지도 페이지 톤). 로그인/회원가입 진입.
import { Link } from "react-router-dom";

import SiteFooter from "../components/common/SiteFooter";
import useIsMobile from "../hooks/useIsMobile";
import "./landing-hero.css";

export default function Landing() {
  const isMobile = useIsMobile();
  const videoSrc = isMobile ? "/main-bg-mobile.mp4" : "/main-bg.mp4";

  return (
    <div className="home">
      <div className="home-wrap">
        <div className="home-frame">
          <div className="home-sea" />

          <div className="home-screen">
            <video
              key={videoSrc}
              className="home-video"
              src={videoSrc}
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
                <br />
                로그인 없이 지도와 AI 추천을 둘러볼 수 있어요.
              </p>

              <div className="home-cta">
                <Link to="/map" className="btn-leaf">
                  🗺️ 둘러보기
                </Link>
                <Link to="/login" className="btn-ghost">
                  로그인 / 주민 등록
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>

      <SiteFooter />
    </div>
  );
}
