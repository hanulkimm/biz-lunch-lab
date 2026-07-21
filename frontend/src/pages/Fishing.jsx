// 청계천 낚시터 — 동숲풍 실사영상 배경 + 오버레이 낚시 미니게임.
//
// 배경: 동숲 스타일 청계천 영상(반복 재생). 그 위 오버레이 레이어에
// 물고기 그림자(원근 스케일) · 찌 · 파문 · 낚싯줄(SVG)을 얹는다.
// 흐름: 물 클릭(캐스팅) → 서버 어종 추첨(서명 토큰) → 그림자 접근
//  → 페이크 입질 → 진짜 입질(찌 침수+!) → 반응 윈도우 클릭 → 도감 기록.
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Fish as FishIcon, Leaf, RefreshCw, X } from "lucide-react";

import { castLine, getCollection, getPond, landFish, sellFish } from "../api/fishing";
import { getVillagerRender } from "../api/villager";
import AppHeader from "../components/common/AppHeader";
import Spinner from "../components/common/Spinner";
import "./fishing.css";

// ─── 영상 속 물 영역 (좌표 %) — 화면 아래에서 다리까지 굽이치는 물길 ───
const WATER_POLY = [
  [33, 99], [35.5, 85], [39.5, 72], [42, 63], [51.5, 63],
  [53.5, 72], [57.5, 85], [60.5, 99],
];
const Y_MIN = 63, Y_MAX = 99;            // 물길 세로 범위 (원근 스케일 계산용)
const ROD_TIP = { x: 29.5, y: 66.5 };    // 낚싯대 끝 (낚싯줄 시작점)
const HAND = { x: 22.5, y: 74 };         // 주민 손 위치 (낚싯대 뿌리)
const DECOR_COUNT = 5;

const SHADOW_SCALE = {
  "X-Small": 0.55, Small: 0.7, Medium: 0.9, Long: 1.25, Large: 1.2,
  "X-Large": 1.45, "X-Large w/Fin": 1.5, "XX-Large": 1.7,
};

// 점이 다각형 안에 있는지 (ray casting)
function inWater(x, y) {
  let inside = false;
  for (let i = 0, j = WATER_POLY.length - 1; i < WATER_POLY.length; j = i++) {
    const [xi, yi] = WATER_POLY[i], [xj, yj] = WATER_POLY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// 원근: 아래(가까움)=크게, 위(멀리)=작게
const depthScale = (y) => 0.45 + ((y - Y_MIN) / (Y_MAX - Y_MIN)) * 0.75;

export default function Fishing() {
  // 배경 없는 주민 전신 이미지 (Nookipedia) — 실패 시 또리로 폴백
  const [villagerImg, setVillagerImg] = useState(null);
  useEffect(() => {
    getVillagerRender()
      .then((r) => setVillagerImg(r.image_url || "/ddori.png"))
      .catch(() => setVillagerImg("/ddori.png"));
  }, []);

  const [phase, setPhase] = useState("idle"); // idle | casting | waiting | bite | result
  const phaseRef = useRef("idle");
  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };

  const [bobber, setBobber] = useState(null);    // {x, y} %
  const [sink, setSink] = useState(false);
  const [nibbleKey, setNibbleKey] = useState(0);
  const [rippleKey, setRippleKey] = useState(0);
  const [notice, setNotice] = useState(null);
  const [result, setResult] = useState(null);
  const [landing, setLanding] = useState(false);
  const [pond, setPond] = useState(null);
  const [panel, setPanel] = useState(false);
  const [col, setCol] = useState(null);
  const [toasts, setToasts] = useState([]);

  const tokenRef = useRef(null);
  const timersRef = useRef([]);
  const sceneRef = useRef(null);
  const bobberRef = useRef(null);                // 최신 찌 좌표 (rAF용)
  const approachRef = useRef(null);
  const shadowRefs = useRef([]);
  const shadowsRef = useRef(
    Array.from({ length: DECOR_COUNT }).map(() => {
      let x, y;
      do {
        x = 34 + Math.random() * 26;
        y = Y_MIN + 3 + Math.random() * (Y_MAX - Y_MIN - 6);
      } while (!inWater(x, y));
      return { x, y, a: Math.random() * Math.PI * 2, s: 0.7 + Math.random() * 0.6, v: 0.035 + Math.random() * 0.03, turn: 0 };
    })
  );

  const toast = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
  }, []);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  const after = (ms, fn) => timersRef.current.push(setTimeout(fn, ms));

  useEffect(() => {
    getPond().then(setPond).catch(() => {});
    return clearTimers;
  }, []);

  const loadCollection = useCallback(() => {
    getCollection().then(setCol).catch(() => toast("도감을 불러오지 못했어요."));
  }, [toast]);

  // ─── 그림자 유영 (rAF, DOM 직접 조작) ───
  useEffect(() => {
    let raf;
    const step = () => {
      shadowsRef.current.forEach((sh, i) => {
        const el = shadowRefs.current[i];
        if (!el) return;
        if (approachRef.current === i && bobberRef.current) {
          const t = bobberRef.current;
          const dx = t.x - sh.x, dy = t.y - sh.y;
          const d = Math.hypot(dx, dy);
          if (d > 2.4) {
            sh.x += (dx / d) * 0.09;
            sh.y += (dy / d) * 0.09;
            sh.a = Math.atan2(dy, dx);
          }
        } else {
          if (Math.random() < 0.025) sh.turn = (Math.random() - 0.5) * 0.09;
          sh.a += sh.turn;
          const nx = sh.x + Math.cos(sh.a) * sh.v;
          const ny = sh.y + Math.sin(sh.a) * sh.v * 0.7;
          if (inWater(nx, ny)) { sh.x = nx; sh.y = ny; }
          else sh.a += Math.PI * (0.7 + Math.random() * 0.6); // 벽에 닿으면 방향 전환
        }
        const sc = sh.s * depthScale(sh.y);
        el.style.left = sh.x + "%";
        el.style.top = sh.y + "%";
        el.style.transform =
          `translate(-50%,-50%) rotate(${(sh.a * 180) / Math.PI}deg) scale(${sc})`;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── 낚시 로직 ───
  const resetWater = () => {
    tokenRef.current = null;
    approachRef.current = null;
    bobberRef.current = null;
    setBobber(null);
    setSink(false);
  };
  const reset = useCallback(() => {
    clearTimers(); resetWater(); setResult(null); setPhaseBoth("idle");
  }, []);
  const flee = useCallback((message) => {
    clearTimers(); resetWater(); setPhaseBoth("idle");
    setNotice(message);
    setTimeout(() => setNotice(null), 2200);
  }, []);

  const success = useCallback(async () => {
    clearTimers();
    setPhaseBoth("result");
    setLanding(true);
    const token = tokenRef.current;
    resetWater();
    try {
      const r = await landFish(token);
      setResult(r);
      setCol(null);
    } catch (e) {
      setPhaseBoth("idle");
      flee(e.response?.data?.detail || "물고기가 빠져나갔어요…");
    } finally {
      setLanding(false);
    }
  }, [flee]);

  const cast = async (pos) => {
    setBobber(pos);
    bobberRef.current = pos;
    setRippleKey((k) => k + 1);
    setPhaseBoth("casting");

    let resp;
    try {
      resp = await castLine();
    } catch {
      return flee("낚싯줄이 엉켰어요. 다시 던져주세요!");
    }
    if (!resp.bite) return flee(resp.message || "입질이 없네요…");

    tokenRef.current = resp.token;
    setPhaseBoth("waiting");

    let nearest = 0, best = 1e9;
    shadowsRef.current.forEach((sh, i) => {
      const d = Math.hypot(sh.x - pos.x, sh.y - pos.y);
      if (d < best) { best = d; nearest = i; }
    });
    approachRef.current = nearest;
    shadowsRef.current[nearest].s = SHADOW_SCALE[resp.shadow] || 0.9;

    let t = 1800;
    for (let i = 0; i < resp.nibbles; i++) {
      t += 550 + Math.random() * 900;
      after(t, () => {
        setNibbleKey((k) => k + 1);
        setRippleKey((k) => k + 1);
      });
    }
    t += 500 + Math.random() * 800;
    after(t, () => {
      setPhaseBoth("bite");
      setSink(true);
      setRippleKey((k) => k + 1);
      after(resp.bite_window_ms, () => {
        if (phaseRef.current === "bite") flee("앗, 놓쳤다…!");
      });
    });
  };

  const onSceneClick = (e) => {
    const p = phaseRef.current;
    if (p === "result") return;
    if (p === "bite") return success();
    if (p === "waiting" || p === "casting")
      return flee("너무 성급했어요! 물고기가 도망갔어요…");
    // idle → 물 안쪽 클릭만 캐스팅
    const rect = sceneRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (!inWater(x, y)) {
      setNotice("물에 던져야죠! 🎣");
      setTimeout(() => setNotice(null), 1400);
      return;
    }
    cast({ x, y });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const p = phaseRef.current;
      if (p === "bite") { e.preventDefault(); success(); }
      else if (p === "waiting") { e.preventDefault(); flee("너무 성급했어요! 물고기가 도망갔어요…"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [success, flee]);

  const doSell = async (f) => {
    try {
      const r = await sellFish(f.id, f.count);
      toast(`${f.name_ko} ${f.count}마리 판매 — 🍃 +${r.earned}잎!`);
      loadCollection();
    } catch (e) {
      toast(e.response?.data?.detail || "판매에 실패했어요.");
    }
  };
  const openPanel = () => { setPanel(true); if (!col) loadCollection(); };

  const bobScale = bobber ? depthScale(bobber.y) : 1;

  return (
    <div className="gw-page fs-page">
      <AppHeader active="fishing" />

      <div className="fs-wrap">
        <div className="fs-top">
          <h1>🎣 청계천 낚시터</h1>
          {pond && (
            <span className="fs-pond">지금 {pond.hour}시 · <b>{pond.available_count}종</b> 활동 중</span>
          )}
        </div>
        <p className="fs-hint">
          물을 클릭해 찌를 던지고, 찌가 <b>완전히 가라앉는 순간</b> 클릭! (스페이스바 가능) —
          톡톡 건드릴 때 당기면 도망가요.
        </p>

        {/* ─── 영상 + 오버레이 ─── */}
        <div className="fs-scene" ref={sceneRef} onClick={onSceneClick}>
          <video
            className="fs-video"
            src="/cheonggyecheon.mp4"
            muted autoPlay loop playsInline
          />

          {/* 물고기 그림자 */}
          {Array.from({ length: DECOR_COUNT }).map((_, i) => (
            <div key={i} className="fs-shadow" ref={(el) => (shadowRefs.current[i] = el)} />
          ))}

          {/* 낚싯대 + 낚싯줄 (SVG 오버레이) */}
          <svg className="fs-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              x1={HAND.x} y1={HAND.y} x2={ROD_TIP.x} y2={ROD_TIP.y}
              stroke="#7a4e2a" strokeWidth="0.55" strokeLinecap="round"
            />
            {bobber && phase !== "casting" && (
              <line
                x1={ROD_TIP.x} y1={ROD_TIP.y} x2={bobber.x} y2={bobber.y - 1}
                stroke="rgba(255,255,255,0.85)" strokeWidth="0.16"
              />
            )}
          </svg>

          {/* 내 주민 (배경 없는 전신) */}
          {villagerImg && (
            <img
              className="fs-villager"
              src={villagerImg}
              alt="내 주민"
              onError={() => setVillagerImg("/ddori.png")}
            />
          )}

          {/* 찌 + 파문 */}
          {bobber && (
            <>
              <div
                key={"nb" + nibbleKey}
                className={`fs-bobber ${sink ? "sink" : ""} ${nibbleKey ? "nib" : ""}`}
                style={{ left: bobber.x + "%", top: bobber.y + "%", "--ds": bobScale }}
              >
                <span className="ball" />
                {sink && <span className="alert">!</span>}
              </div>
              <span
                key={"rp" + rippleKey}
                className="fs-ripple"
                style={{ left: bobber.x + "%", top: bobber.y + "%", "--ds": bobScale }}
              />
            </>
          )}

          {notice && <div className="fs-notice">{notice}</div>}
        </div>

        <div className="fs-dock">
          <button className="fs-dock-btn" onClick={openPanel}>
            <BookOpen size={17} /> 주머니 · 도감
          </button>
        </div>
      </div>

      {/* ─── 낚은 결과 ─── */}
      {phase === "result" && (
        <div className="fs-modal-bg">
          <div className="fs-modal">
            <button className="fs-modal-x" onClick={reset} aria-label="닫기">
              <X size={16} />
            </button>
            {landing || !result ? (
              <div className="fs-landing"><Spinner size={36} /><p>끌어올리는 중…</p></div>
            ) : (
              <>
                {result.new && <div className="fs-new">✨ 도감 등록!</div>}
                <img src={result.fish.image} alt={result.fish.name_ko} />
                <h2>{result.fish.name_ko}를 낚았다!</h2>
                <div className="fs-chips">
                  <span>그림자 {result.fish.shadow_ko}</span>
                  <span><Leaf size={12} /> {result.fish.price}잎</span>
                  <span>{result.count}마리째</span>
                </div>
                <div className="fs-acts">
                  <button className="fs-sub" onClick={() => { reset(); openPanel(); }}>
                    <BookOpen size={15} /> 도감 보기
                  </button>
                  <button className="btn-leaf" onClick={reset}>
                    <RefreshCw size={15} /> 계속 낚시
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── 주머니/도감 패널 ─── */}
      {panel && (
        <div className="fs-panel">
          <div className="fs-panel-head">
            <h2><FishIcon size={18} /> 물고기 도감</h2>
            {col && (
              <span className="fs-progress">
                {col.caught_count}/{col.total_count} · <Leaf size={13} /> {col.leaves?.toLocaleString()}잎
              </span>
            )}
            <button className="fs-x" onClick={() => setPanel(false)} aria-label="닫기">
              <X size={16} />
            </button>
          </div>
          {!col ? (
            <div className="fs-panel-loading"><Spinner size={28} /></div>
          ) : (
            <div className="fs-grid">
              {col.fish.map((f) => (
                <div key={f.id} className={f.caught ? "fs-cell" : "fs-cell unknown"}>
                  <img src={f.icon} alt={f.caught ? f.name_ko : "???"} loading="lazy" />
                  <em>{f.caught ? f.name_ko : "???"}</em>
                  {f.caught ? (
                    f.count > 0 ? (
                      <button className="fs-sell" onClick={() => doSell(f)}>
                        {f.count}마리 판매 +{f.price * f.count}🍃
                      </button>
                    ) : (
                      <span className="fs-zero">판매 완료</span>
                    )
                  ) : (
                    <span className="fs-zero">{f.shadow_ko} 그림자</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="fs-toasts">
        {toasts.map((t) => <div key={t.id} className="fs-toast">{t.msg}</div>)}
      </div>
    </div>
  );
}
