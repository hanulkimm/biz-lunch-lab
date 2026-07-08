// 닮은꼴 주민 찾기 — 퀴즈 + (선택) 사진으로 나와 닮은 동물의 숲 주민 매칭.
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, RefreshCw, Sparkles, X } from "lucide-react";

import { matchVillager, saveVillagerProfile } from "../api/villager";
import AppHeader from "../components/common/AppHeader";
import Spinner from "../components/common/Spinner";
import { useAuthStore } from "../store/authStore";
import "./villagermatch.css";

// ─── 퀴즈 정의 (키는 백엔드 스코어링과 맞춤) ───
const QUESTIONS = [
  {
    key: "vibe1",
    title: "점심시간, 나는?",
    options: [
      { v: "active", e: "🏃", label: "헬스장·산책 다녀오기" },
      { v: "solo", e: "🎧", label: "조용히 혼밥 + 유튜브" },
      { v: "social", e: "💬", label: "동료들과 수다 풀코스" },
      { v: "cafe", e: "☕", label: "분위기 좋은 카페에서 여유" },
    ],
  },
  {
    key: "vibe2",
    title: "회사에서 내 이미지는?",
    options: [
      { v: "tsundere", e: "🧢", label: "츤데레, 알고 보면 정 많은 선배" },
      { v: "insider", e: "🎉", label: "인싸, 팀 에너지 담당" },
      { v: "counselor", e: "🍵", label: "고민 들어주는 다정한 상담사" },
      { v: "pro", e: "💼", label: "자기관리 철저한 프로" },
    ],
  },
  {
    key: "hobby",
    title: "주말에 주로 뭐 해?",
    options: [
      { v: "Education", e: "📚", label: "책·다큐·공부" },
      { v: "Fashion", e: "👗", label: "쇼핑·패션·꾸미기" },
      { v: "Fitness", e: "💪", label: "운동·등산" },
      { v: "Music", e: "🎵", label: "음악·공연·노래" },
      { v: "Nature", e: "🌿", label: "산책·식물·캠핑" },
      { v: "Play", e: "🎮", label: "게임·놀기" },
    ],
  },
  {
    key: "color",
    title: "가장 끌리는 색은?",
    colors: true,
    options: [
      { v: "Red", c: "#e0524d", label: "빨강" },
      { v: "Orange", c: "#f08c33", label: "주황" },
      { v: "Yellow", c: "#f4c94e", label: "노랑" },
      { v: "Green", c: "#79b95c", label: "초록" },
      { v: "Aqua", c: "#63c6c0", label: "아쿠아" },
      { v: "Blue", c: "#5a8fd6", label: "파랑" },
      { v: "Purple", c: "#9a79c9", label: "보라" },
      { v: "Pink", c: "#ef9ab6", label: "핑크" },
      { v: "Brown", c: "#9c7350", label: "갈색" },
      { v: "Beige", c: "#d9c39a", label: "베이지" },
      { v: "Gray", c: "#9aa0a3", label: "회색" },
      { v: "Black", c: "#40444a", label: "검정" },
      { v: "White", c: "#f4f1e8", label: "하양", ink: true },
      { v: "Colorful", c: "linear-gradient(135deg,#e0524d,#f4c94e,#79b95c,#5a8fd6,#9a79c9)", label: "알록달록" },
    ],
  },
  {
    key: "style",
    title: "내 스타일에 가장 가까운 건?",
    options: [
      { v: "Simple", e: "🧺", label: "심플·꾸안꾸" },
      { v: "Cool", e: "🕶️", label: "쿨·시크" },
      { v: "Cute", e: "🎀", label: "큐트·러블리" },
      { v: "Elegant", e: "🌹", label: "엘레강트·단정" },
      { v: "Gorgeous", e: "👑", label: "화려·고저스" },
      { v: "Active", e: "⚡", label: "액티브·스포티" },
    ],
  },
];

const LOADING_LINES = [
  "🍃 섬 주민들을 불러모으는 중…",
  "🔍 닮은꼴을 요리조리 뜯어보는 중…",
  "📸 인상착의를 대조하는 중…",
  "🏝️ 싱크로율을 계산하는 중…",
];

// 업로드 사진을 브라우저에서 축소(긴 변 768px, JPEG) — 전송량·분석 비용 절약.
async function resizePhoto(file, max = 768) {
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // 디코딩 실패 포맷은 원본 그대로 (서버에서 형식 검증)
  }
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function VillagerMatch() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const fileRef = useRef(null);

  // step: -1 인트로 → 0..4 퀴즈 → 5 생일 → 6 사진 → "loading" → "result"
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [birth, setBirth] = useState({ month: "", day: "" });
  const [photo, setPhoto] = useState(null);       // File
  const [preview, setPreview] = useState(null);   // objectURL
  const [loadLine, setLoadLine] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pick = (key, v) => {
    setAnswers((p) => ({ ...p, [key]: v }));
    setStep((s) => s + 1);
  };

  const onPhoto = async (file) => {
    if (!file) return;
    const small = await resizePhoto(file);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
  };

  const run = async (withPhoto) => {
    setStep("loading");
    setError(null);
    const ticker = setInterval(
      () => setLoadLine((n) => (n + 1) % LOADING_LINES.length),
      1800
    );
    try {
      const quiz = { ...answers };
      if (birth.month && birth.day) {
        quiz.birth_month = Number(birth.month);
        quiz.birth_day = Number(birth.day);
      }
      const r = await matchVillager(quiz, withPhoto ? photo : null);
      setResult(r);
      setSaved(false);
      setStep("result");
    } catch {
      setError("결과를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
      setStep(6);
    } finally {
      clearInterval(ticker);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const me = await saveVillagerProfile({
        ...result.villager,
        match_percent: result.match_percent,
        reason: result.reason,
      });
      setUser(me);
      setSaved(true);
    } catch {
      setError("프로필 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setBirth({ month: "", day: "" });
    setPhoto(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStep(0);
  };

  const totalSteps = QUESTIONS.length + 2; // 퀴즈 5 + 생일 + 사진
  const stepNo = typeof step === "number" && step >= 0 ? step : null;

  return (
    <div className="gw-page">
      <AppHeader active="mypage" />
      <div className="vm">
        {/* ─── 인트로 ─── */}
        {step === -1 && (
          <div className="vm-card vm-intro">
            <div className="vm-emoji">🏝️</div>
            <h1>나랑 닮은 주민 찾기</h1>
            <p>
              간단한 퀴즈에 답하면, 동물의 숲 주민 413명 중<br />
              {user?.name ? `${user.name}님과` : "나와"} 가장 닮은 주민을 찾아드려요.
            </p>
            <p className="vm-privacy">
              📷 사진은 선택사항이에요. 분석에만 쓰고 <b>저장하지 않아요.</b>
            </p>
            <button className="btn-leaf" onClick={() => setStep(0)}>
              <Sparkles size={17} /> 시작하기
            </button>
          </div>
        )}

        {/* ─── 퀴즈 ─── */}
        {stepNo !== null && stepNo < QUESTIONS.length && (
          <div className="vm-card">
            <div className="vm-top">
              <button className="vm-back" onClick={() => setStep(stepNo === 0 ? -1 : stepNo - 1)} aria-label="이전">
                <ArrowLeft size={17} />
              </button>
              <div className="vm-dots">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span key={i} className={i <= stepNo ? "on" : ""} />
                ))}
              </div>
            </div>
            <h2>{QUESTIONS[stepNo].title}</h2>
            {QUESTIONS[stepNo].colors ? (
              <div className="vm-swatches">
                {QUESTIONS[stepNo].options.map((o) => (
                  <button
                    key={o.v}
                    className={answers.color === o.v ? "vm-swatch on" : "vm-swatch"}
                    onClick={() => pick("color", o.v)}
                    title={o.label}
                  >
                    <span className="chip" style={{ background: o.c }}>
                      {answers.color === o.v && <Check size={15} color={o.ink ? "#5E4B2E" : "#fff"} />}
                    </span>
                    <em>{o.label}</em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="vm-opts">
                {QUESTIONS[stepNo].options.map((o) => (
                  <button
                    key={o.v}
                    className={answers[QUESTIONS[stepNo].key] === o.v ? "vm-opt on" : "vm-opt"}
                    onClick={() => pick(QUESTIONS[stepNo].key, o.v)}
                  >
                    <span className="e">{o.e}</span> {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── 생일 ─── */}
        {stepNo === QUESTIONS.length && (
          <div className="vm-card">
            <div className="vm-top">
              <button className="vm-back" onClick={() => setStep(stepNo - 1)} aria-label="이전">
                <ArrowLeft size={17} />
              </button>
              <div className="vm-dots">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span key={i} className={i <= stepNo ? "on" : ""} />
                ))}
              </div>
            </div>
            <h2>생일이 언제예요?</h2>
            <p className="vm-hint">생일이 같은 주민을 만나면 싱크로율이 올라가요. (선택)</p>
            <div className="vm-birth">
              <select value={birth.month} onChange={(e) => setBirth((p) => ({ ...p, month: e.target.value }))}>
                <option value="">월</option>
                {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
              </select>
              <select value={birth.day} onChange={(e) => setBirth((p) => ({ ...p, day: e.target.value }))}>
                <option value="">일</option>
                {DAYS.map((d) => <option key={d} value={d}>{d}일</option>)}
              </select>
            </div>
            <div className="vm-actions">
              <button className="vm-skip" onClick={() => { setBirth({ month: "", day: "" }); setStep(stepNo + 1); }}>
                건너뛰기
              </button>
              <button className="btn-leaf" disabled={!birth.month || !birth.day} onClick={() => setStep(stepNo + 1)}>
                다음
              </button>
            </div>
          </div>
        )}

        {/* ─── 사진 (선택) ─── */}
        {stepNo === QUESTIONS.length + 1 && (
          <div className="vm-card">
            <div className="vm-top">
              <button className="vm-back" onClick={() => setStep(stepNo - 1)} aria-label="이전">
                <ArrowLeft size={17} />
              </button>
              <div className="vm-dots">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span key={i} className={i <= stepNo ? "on" : ""} />
                ))}
              </div>
            </div>
            <h2>사진도 볼까요?</h2>
            <p className="vm-hint">
              사진을 올리면 인상·분위기까지 반영해서 골라줘요.<br />
              분석에만 쓰고 <b>어디에도 저장하지 않아요.</b>
            </p>

            {preview ? (
              <div className="vm-preview">
                <img src={preview} alt="업로드한 사진 미리보기" />
                <button className="vm-x" onClick={() => { setPhoto(null); setPreview(null); }} aria-label="사진 제거">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button className="vm-drop" onClick={() => fileRef.current?.click()}>
                <Camera size={26} />
                <span>사진 올리기 (jpg·png)</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />

            {error && <p className="vm-error">{error}</p>}

            <div className="vm-actions">
              <button className="vm-skip" onClick={() => run(false)}>사진 없이 결과 보기</button>
              <button className="btn-leaf" disabled={!photo} onClick={() => run(true)}>
                <Sparkles size={16} /> 결과 보기
              </button>
            </div>
          </div>
        )}

        {/* ─── 로딩 ─── */}
        {step === "loading" && (
          <div className="vm-card vm-loading">
            <Spinner size={40} />
            <p>{LOADING_LINES[loadLine]}</p>
          </div>
        )}

        {/* ─── 결과 ─── */}
        {step === "result" && result && (
          <div className="vm-card vm-result">
            <div className="vm-badge">싱크로율 {result.match_percent}%</div>
            <div className="vm-photo" style={{ background: result.villager.bubble_color }}>
              <img src={result.villager.photo} alt={result.villager.name_ko} />
            </div>
            <h2 className="vm-name">{result.villager.name_ko}</h2>
            <div className="vm-chips">
              <span>{result.villager.species_ko}</span>
              <span>{result.villager.personality_ko}</span>
              <span>{result.villager.hobby_ko} 좋아함</span>
              <span>🎂 {result.villager.birthday}</span>
            </div>
            <p className="vm-catch">“{result.villager.catchphrase_ko}”</p>
            <div className="vm-reason">{result.reason}</div>

            {result.runner_ups?.length > 0 && (
              <div className="vm-runners">
                <span className="t">아쉽게 2·3위</span>
                {result.runner_ups.map((r) => (
                  <span key={r.id} className="r">
                    <img src={r.icon} alt={r.name_ko} /> {r.name_ko}
                  </span>
                ))}
              </div>
            )}

            {error && <p className="vm-error">{error}</p>}

            <div className="vm-actions">
              <button className="vm-skip" onClick={retry}>
                <RefreshCw size={15} /> 다시 하기
              </button>
              {saved ? (
                <button className="btn-leaf" onClick={() => navigate("/mypage")}>
                  <Check size={16} /> 저장 완료! 마이페이지로
                </button>
              ) : (
                <button className="btn-leaf" onClick={save} disabled={saving}>
                  {saving ? <><Spinner size={17} /> 저장 중…</> : "프로필 사진으로 설정"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
