// 둥근 모서리 커스텀 드롭다운 — 네이티브 select 옵션 목록은 모서리를 둥글게 못 해서 대체.
// 동물의 숲 톤(크림 패널 + 잎새 하이라이트). 외부 클릭/ESC로 닫힘.
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function SelectField({
  value,
  onChange,
  options = [],
  placeholder = "선택",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 옵션이 사라지면(상위 담당 변경 등) 자동으로 닫기
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const pick = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={`sf${disabled ? " disabled" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="sf-btn"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={selected ? "sf-value" : "sf-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`sf-arrow${open ? " open" : ""}`} />
      </button>

      {open && (
        <ul className="sf-menu" role="listbox">
          {options.length === 0 ? (
            <li className="sf-empty">선택할 항목이 없어요</li>
          ) : (
            options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className={`sf-opt${o.value === value ? " sel" : ""}`}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
