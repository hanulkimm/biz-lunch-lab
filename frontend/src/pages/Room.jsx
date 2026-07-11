// 내 방 꾸미기 — CSS 3D 아이소메트릭 룸 + 너굴상점 + 동숲식 인벤토리.
//
// 방은 perspective + rotateX/rotateZ로 세운 진짜 3D 평면(바닥+벽 2면)이고,
// 가구 스프라이트는 역회전(billboard)시켜 카메라를 향하게 한다.
// 배치는 클릭 방식: 인벤토리에서 아이템 선택 → 바닥 칸/벽 슬롯 클릭.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Armchair, Check, Image as ImageIcon, Leaf, Package, PaintRoller,
  ShoppingBag, Sparkles, Trash2, X,
} from "lucide-react";

import { buyItem, getCatalog, getMyRoom, saveLayout } from "../api/room";
import AppHeader from "../components/common/AppHeader";
import Spinner from "../components/common/Spinner";
import "./room.css";

const GRID = 8;          // 바닥 8x8 칸
const CELL = 54;         // px
const WALL_SLOTS = 4;    // 벽면당 걸 수 있는 슬롯 수

const CAT_META = {
  furniture: { label: "가구", icon: Armchair },
  wall: { label: "벽걸이", icon: ImageIcon },
  art: { label: "미술품", icon: Sparkles },
  wallpaper: { label: "벽지", icon: PaintRoller },
  floor: { label: "바닥", icon: PaintRoller },
  rug: { label: "러그", icon: Package },
};
const CATS = Object.keys(CAT_META);

const EMPTY_LAYOUT = { floor_items: [], wall_items: [], wallpaper: null, floor: null, rug: null };

// 벽지/바닥 아이콘 → 타일 텍스처로 크롭 (벽지 아이콘 상단의 '말린 롤' 제거 등).
// acnhcdn이 CORS를 허용해 캔버스로 잘라 dataURL로 재사용한다.
const texCache = {};
function cropTexture(url, { top = 0, right = 0, bottom = 0, left = 0 } = {}) {
  const key = `${url}|${top},${right},${bottom},${left}`;
  if (!texCache[key]) {
    texCache[key] = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const sx = img.width * left, sy = img.height * top;
          const sw = img.width * (1 - left - right), sh = img.height * (1 - top - bottom);
          const c = document.createElement("canvas");
          c.width = sw; c.height = sh;
          c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          resolve(c.toDataURL());
        } catch { resolve(url); }
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }
  return texCache[key];
}

// 바닥 아이템들이 차지하는 칸 집합 (겹침 검사용)
function occupiedCells(floorItems, byId, exceptIndex = -1) {
  const cells = new Set();
  floorItems.forEach((it, i) => {
    if (i === exceptIndex) return;
    const item = byId[it.id];
    if (!item) return;
    for (let dx = 0; dx < item.w; dx++)
      for (let dy = 0; dy < item.h; dy++)
        cells.add(`${it.x + dx},${it.y + dy}`);
  });
  return cells;
}

function canPlace(item, x, y, occupied) {
  if (x < 0 || y < 0 || x + item.w > GRID || y + item.h > GRID) return false;
  for (let dx = 0; dx < item.w; dx++)
    for (let dy = 0; dy < item.h; dy++)
      if (occupied.has(`${x + dx},${y + dy}`)) return false;
  return true;
}

export default function Room() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [leaves, setLeaves] = useState(0);
  const [owned, setOwned] = useState([]);          // item_id[]
  const [layout, setLayout] = useState(EMPTY_LAYOUT);
  const [panel, setPanel] = useState(null);        // null | 'inventory' | 'shop'
  const [tab, setTab] = useState("furniture");
  const [placing, setPlacing] = useState(null);    // 배치 대기 중인 아이템
  const [buying, setBuying] = useState(null);      // 구매 확인 대상
  const [toasts, setToasts] = useState([]);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const skipSave = useRef(true);

  const byId = useMemo(
    () => Object.fromEntries((catalog || []).map((c) => [c.id, c])),
    [catalog]
  );

  const toast = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);

  // ─── 초기 로드 ───
  useEffect(() => {
    Promise.all([getCatalog(), getMyRoom()])
      .then(([cat, room]) => {
        setCatalog(cat);
        setLeaves(room.leaves);
        setOwned(room.items);
        setLayout({ ...EMPTY_LAYOUT, ...(room.layout || {}) });
        if (room.backfilled > 0) {
          toast(`그동안 남긴 리뷰 보상이 도착했어요! 🍃 +${room.backfilled}잎`);
        }
        skipSave.current = true;
      })
      .catch(() => toast("방 정보를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [toast]);

  // ─── 레이아웃 자동 저장 (디바운스) ───
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    setSaved(false);
    const t = setTimeout(() => {
      saveLayout(layout)
        .then(() => setSaved(true))
        .catch(() => toast("저장에 실패했어요. 잠시 후 다시 시도해 주세요."));
    }, 800);
    return () => clearTimeout(t);
  }, [layout, toast]);

  // ─── 파생 상태 ───
  const occupied = useMemo(
    () => occupiedCells(layout.floor_items, byId),
    [layout.floor_items, byId]
  );
  const placedIds = useMemo(() => {
    const s = new Set(layout.floor_items.map((i) => i.id));
    layout.wall_items.forEach((i) => s.add(i.id));
    if (layout.rug) s.add(layout.rug.id);
    return s;
  }, [layout]);
  const usedWallSlots = useMemo(
    () => new Set(layout.wall_items.map((i) => `${i.wall}:${i.slot}`)),
    [layout.wall_items]
  );

  const wallpaperItem = layout.wallpaper ? byId[layout.wallpaper] : null;
  const floorItem = layout.floor ? byId[layout.floor] : null;

  // 아이콘 → 크롭된 텍스처 (벽지: 상단 롤 제거 / 바닥: 투명 여백 제거)
  const [wallTex, setWallTex] = useState(null);
  const [floorTex, setFloorTex] = useState(null);
  useEffect(() => {
    if (!wallpaperItem) return setWallTex(null);
    cropTexture(wallpaperItem.image, { top: 0.3, left: 0.08, right: 0.17, bottom: 0.04 }).then(setWallTex);
  }, [wallpaperItem]);
  useEffect(() => {
    if (!floorItem) return setFloorTex(null);
    cropTexture(floorItem.image, { top: 0.17, left: 0.17, right: 0.17, bottom: 0.17 }).then(setFloorTex);
  }, [floorItem]);

  // ─── 액션 ───
  const startPlace = (item) => {
    if (item.cat === "wallpaper") {
      setLayout((p) => ({ ...p, wallpaper: item.id }));
      toast(`${item.name_ko}로 도배했어요!`);
      return;
    }
    if (item.cat === "floor") {
      setLayout((p) => ({ ...p, floor: item.id }));
      toast(`바닥을 ${item.name_ko}(으)로 바꿨어요!`);
      return;
    }
    setPlacing(item);
    setPanel(null);
  };

  const clickCell = (x, y) => {
    if (!placing) return;
    if (placing.cat === "rug") {
      setLayout((p) => ({ ...p, rug: { id: placing.id, x, y } }));
      setPlacing(null);
      return;
    }
    if (placing.cat !== "furniture") return;
    if (!canPlace(placing, x, y, occupied)) return;
    setLayout((p) => ({
      ...p,
      floor_items: [...p.floor_items, { id: placing.id, x, y }],
    }));
    setPlacing(null);
  };

  const clickWallSlot = (wall, slot) => {
    if (!placing || (placing.cat !== "wall" && placing.cat !== "art")) return;
    if (usedWallSlots.has(`${wall}:${slot}`)) return;
    setLayout((p) => ({
      ...p,
      wall_items: [...p.wall_items, { id: placing.id, wall, slot }],
    }));
    setPlacing(null);
  };

  const pickUpFloor = (index) =>
    setLayout((p) => ({
      ...p,
      floor_items: p.floor_items.filter((_, i) => i !== index),
    }));
  const pickUpWall = (index) =>
    setLayout((p) => ({
      ...p,
      wall_items: p.wall_items.filter((_, i) => i !== index),
    }));

  const doBuy = async () => {
    const item = buying;
    try {
      const res = await buyItem(item.id);
      setLeaves(res.leaves);
      setOwned((p) => [...p, item.id]);
      toast(`${item.name_ko} 구매 완료! 🎉`);
    } catch (e) {
      toast(e.response?.data?.detail || "구매에 실패했어요.");
    } finally {
      setBuying(null);
    }
  };

  // ─── 렌더 도우미 ───
  const inventoryItems = (catalog || []).filter(
    (c) => owned.includes(c.id) && c.cat === tab
  );
  const shopItems = (catalog || []).filter((c) => c.cat === tab);

  if (loading) {
    return (
      <div className="gw-page">
        <AppHeader active="room" />
        <div className="rm-loading"><Spinner size={40} /><p>섬에 들어가는 중…</p></div>
      </div>
    );
  }

  return (
    <div className="gw-page rm-page">
      <AppHeader active="room" />

      {/* 상단 HUD */}
      <div className="rm-hud">
        <div className="rm-leaves" key={leaves}>
          <Leaf size={17} /> {leaves.toLocaleString()}잎
        </div>
        <div className={saved ? "rm-saved on" : "rm-saved"}>
          <Check size={14} /> {saved ? "저장됨" : "저장 중…"}
        </div>
      </div>

      {/* ─── 3D 방 ─── */}
      <div className={placing ? "rm-scene placing" : "rm-scene"}>
        <div className="rm-world">
          {/* 벽 2면 */}
          {["L", "R"].map((wall) => (
            <div key={wall} className={wall === "L" ? "rm-wall rm-wall-l" : "rm-wall rm-wall-r"}>
              <div
                className="rm-wall-in"
                style={
                  wallTex
                    ? { backgroundImage: `url(${wallTex})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }
                    : undefined
                }
              >
                {Array.from({ length: WALL_SLOTS }).map((_, s) => (
                  <button
                    key={s}
                    className={
                      placing && (placing.cat === "wall" || placing.cat === "art") && !usedWallSlots.has(`${wall}:${s}`)
                        ? "rm-wslot open"
                        : "rm-wslot"
                    }
                    style={{ left: `${((s + 0.5) / WALL_SLOTS) * 100}%` }}
                    onClick={() => clickWallSlot(wall, s)}
                    aria-label={`${wall === "L" ? "왼쪽" : "오른쪽"} 벽 ${s + 1}번 자리`}
                  />
                ))}
                {layout.wall_items.map((it, i) =>
                  it.wall === wall && byId[it.id] ? (
                    <img
                      key={`${it.id}-${i}`}
                      className="rm-witem"
                      src={byId[it.id].image}
                      alt={byId[it.id].name_ko}
                      title={`${byId[it.id].name_ko} (클릭해서 떼기)`}
                      style={{ left: `${((it.slot + 0.5) / WALL_SLOTS) * 100}%` }}
                      onClick={() => pickUpWall(i)}
                    />
                  ) : null
                )}
              </div>
            </div>
          ))}

          {/* 바닥 */}
          <div
            className="rm-floor"
            style={floorTex ? { backgroundImage: `url(${floorTex})` } : undefined}
          >
            {/* 러그 (바닥에 평평하게) */}
            {layout.rug && byId[layout.rug.id] && (
              <img
                className="rm-rug"
                src={byId[layout.rug.id].image}
                alt={byId[layout.rug.id].name_ko}
                title="클릭해서 치우기"
                style={{
                  left: layout.rug.x * CELL,
                  top: layout.rug.y * CELL,
                  width: byId[layout.rug.id].w * CELL,
                  height: byId[layout.rug.id].h * CELL,
                }}
                onClick={() => setLayout((p) => ({ ...p, rug: null }))}
              />
            )}

            {/* 배치 모드용 칸 하이라이트 */}
            {placing &&
              (placing.cat === "furniture" || placing.cat === "rug") &&
              Array.from({ length: GRID * GRID }).map((_, i) => {
                const x = i % GRID, y = Math.floor(i / GRID);
                const ok =
                  placing.cat === "rug"
                    ? x + placing.w <= GRID && y + placing.h <= GRID
                    : canPlace(placing, x, y, occupied);
                return (
                  <button
                    key={i}
                    className={ok ? "rm-cell ok" : "rm-cell"}
                    style={{ left: x * CELL, top: y * CELL }}
                    onClick={() => clickCell(x, y)}
                    aria-label={`${x + 1}, ${y + 1} 칸`}
                  />
                );
              })}

            {/* 가구 스프라이트 (역회전 billboard) */}
            {layout.floor_items.map((it, i) => {
              const item = byId[it.id];
              if (!item) return null;
              return (
                <div
                  key={`${it.id}-${i}`}
                  className="rm-spot"
                  style={{
                    left: it.x * CELL,
                    top: it.y * CELL,
                    width: item.w * CELL,
                    height: item.h * CELL,
                    zIndex: it.x + it.y + 1,
                  }}
                >
                  <img
                    className="rm-sprite"
                    src={item.image}
                    alt={item.name_ko}
                    title={`${item.name_ko} (클릭해서 집기)`}
                    style={{ width: Math.max(item.w, item.h) * CELL * 1.25 }}
                    onClick={() => !placing && pickUpFloor(i)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 배치 안내 배너 */}
      {placing && (
        <div className="rm-placing-bar">
          <img src={placing.image} alt="" />
          <span>
            <b>{placing.name_ko}</b>
            {placing.cat === "wall" || placing.cat === "art"
              ? " — 벽의 빈 자리를 눌러 걸어주세요"
              : " — 바닥의 초록 칸을 눌러 놓아주세요"}
          </span>
          <button onClick={() => setPlacing(null)} aria-label="배치 취소"><X size={16} /></button>
        </div>
      )}

      {/* 하단 도크 */}
      <div className="rm-dock">
        <button
          className={panel === "inventory" ? "rm-dock-btn on" : "rm-dock-btn"}
          onClick={() => setPanel(panel === "inventory" ? null : "inventory")}
        >
          <Package size={18} /> 인벤토리
        </button>
        <button
          className={panel === "shop" ? "rm-dock-btn on" : "rm-dock-btn"}
          onClick={() => setPanel(panel === "shop" ? null : "shop")}
        >
          <ShoppingBag size={18} /> 너굴상점
        </button>
      </div>

      {/* ─── 인벤토리 / 상점 패널 ─── */}
      {panel && (
        <div className="rm-panel">
          <div className="rm-panel-head">
            <h2>{panel === "inventory" ? "🎒 인벤토리" : "🛒 너굴상점"}</h2>
            {panel === "shop" && (
              <span className="rm-panel-leaves"><Leaf size={14} /> {leaves.toLocaleString()}잎</span>
            )}
            <button className="rm-panel-x" onClick={() => setPanel(null)} aria-label="닫기">
              <X size={17} />
            </button>
          </div>

          <div className="rm-tabs">
            {CATS.map((c) => {
              const Icon = CAT_META[c].icon;
              return (
                <button
                  key={c}
                  className={tab === c ? "rm-tab on" : "rm-tab"}
                  onClick={() => setTab(c)}
                >
                  <Icon size={14} /> {CAT_META[c].label}
                </button>
              );
            })}
          </div>

          {panel === "inventory" ? (
            inventoryItems.length === 0 ? (
              <div className="rm-empty">
                <p>이 칸은 아직 비어있어요.<br />너굴상점에서 장만해 보세요! 🍃</p>
                <button className="btn-leaf" onClick={() => setPanel("shop")}>
                  <ShoppingBag size={16} /> 상점 구경하기
                </button>
              </div>
            ) : (
              <div className="rm-grid">
                {inventoryItems.map((item) => {
                  const inUse = placedIds.has(item.id) ||
                    layout.wallpaper === item.id || layout.floor === item.id;
                  return (
                    <button
                      key={item.id}
                      className={inUse ? "rm-slot used" : "rm-slot"}
                      onClick={() => startPlace(item)}
                      title={inUse ? `${item.name_ko} (배치됨 — 추가 배치는 불가)` : item.name_ko}
                      disabled={inUse && item.cat !== "wallpaper" && item.cat !== "floor"}
                    >
                      <img src={item.image} alt={item.name_ko} loading="lazy" />
                      <em>{item.name_ko}</em>
                      {inUse && <span className="badge">배치됨</span>}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="rm-grid">
              {shopItems.map((item) => {
                const has = owned.includes(item.id);
                const poor = leaves < item.price;
                return (
                  <button
                    key={item.id}
                    className={has ? "rm-slot used" : poor ? "rm-slot poor" : "rm-slot"}
                    onClick={() => !has && !poor && setBuying(item)}
                    disabled={has || poor}
                    title={item.name_ko + (item.real_title ? ` — ${item.real_title}` : "")}
                  >
                    <img src={item.image} alt={item.name_ko} loading="lazy" />
                    <em>{item.name_ko}</em>
                    <span className={has ? "badge" : "price"}>
                      {has ? "보유중" : <><Leaf size={11} /> {item.price}</>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 구매 확인 */}
      {buying && (
        <div className="rm-modal-bg" onClick={() => setBuying(null)}>
          <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
            <img src={buying.image} alt={buying.name_ko} />
            <h3>{buying.name_ko}</h3>
            {buying.artist && <p className="artist">{buying.real_title} — {buying.artist}</p>}
            <p className="cost"><Leaf size={15} /> {buying.price}잎</p>
            <div className="acts">
              <button className="cancel" onClick={() => setBuying(null)}>다음에</button>
              <button className="btn-leaf" onClick={doBuy}>구매하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      <div className="rm-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="rm-toast">{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
