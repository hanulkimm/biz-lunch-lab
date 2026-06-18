// 인라인 로딩 스피너 — 버튼/패널 등 진행 중 표시. 색은 currentColor를 따른다.
export default function Spinner({ size = 18 }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
