// 공용 확인 다이얼로그 — 동물의 숲 톤. window.confirm 대체.
import Spinner from "./Spinner";
import "./confirmdialog.css";

export default function ConfirmDialog({
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="cd-bg" onClick={loading ? undefined : onCancel}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="cd-title">{title}</h2>
        {message && <p className="cd-msg">{message}</p>}
        <div className="cd-actions">
          <button className="cd-cancel" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button
            className={danger ? "cd-confirm danger" : "cd-confirm"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <><Spinner size={18} /> 처리 중…</> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
