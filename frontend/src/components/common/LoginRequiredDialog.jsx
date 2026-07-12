// 비로그인 사용자가 주민 전용 기능을 눌렀을 때 — 로그인 안내 후 로그인 페이지로.
import { useNavigate } from "react-router-dom";

import ConfirmDialog from "./ConfirmDialog";

export default function LoginRequiredDialog({ feature, target, onCancel }) {
  const navigate = useNavigate();

  return (
    <ConfirmDialog
      title="로그인이 필요해요"
      message={`${feature}는 주민만 이용할 수 있어요. 로그인하고 함께해요!`}
      confirmText="로그인하러 가기"
      cancelText="다음에요"
      onConfirm={() => navigate("/login", { state: { from: { pathname: target } } })}
      onCancel={onCancel}
    />
  );
}
