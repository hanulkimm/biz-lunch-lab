// 사이트 하단 footer — 제작자 표기 + 건의하기 + 동물의 숲 컨셉 저작권 고지(비영리 사이드 프로젝트).
import { useState } from "react";
import { MessageCirclePlus } from "lucide-react";

import FeedbackModal from "./FeedbackModal";
import "./sitefooter.css";

const REPO_URL = "https://github.com/hanulkimm/biz-lunch-lab";

// lucide-react 최신 버전엔 브랜드(Github) 아이콘이 없어 인라인 SVG 사용.
function GithubMark({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export default function SiteFooter() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <footer className="site-foot">
      <div className="site-foot-inner">
        <div className="site-foot-maker">
          <span className="sf-brand">🍱 BizLunchLab</span>
          <span className="sf-sep">·</span>
          <span className="sf-person">기업사업본부 기업사업개발1담당 기업사업개발2팀 김하늘</span>
          <a className="sf-gh" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub 저장소">
            <GithubMark size={14} /> GitHub
          </a>
          <button className="sf-feedback" onClick={() => setFeedbackOpen(true)}>
            <MessageCirclePlus size={14} /> 건의하기
          </button>
        </div>

        <p className="site-foot-note">
          개인이 만든 비영리 사이드 프로젝트입니다. ‘동물의 숲(Animal Crossing)’은 닌텐도(Nintendo)의
          상표이며, 본 프로젝트는 닌텐도와 제휴·후원 관계가 없는 비공식 팬 창작물입니다.
          디자인은 해당 컨셉에서 영감을 받았을 뿐이고, 관련 상표·저작권은 각 권리자에게 있습니다.
          문제가 될 경우 알려주시면 조치하겠습니다.
        </p>
      </div>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </footer>
  );
}
