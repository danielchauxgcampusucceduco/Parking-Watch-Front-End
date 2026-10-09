import type { CameraStatus, ReportStatus } from "../api/types";
import { CAMERA_STATUS, REPORT_STATUS } from "../labels";

const REPORT_ICON: Record<ReportStatus, string> = { NEW: "▲", CONFIRMED: "✔", DISMISSED: "✕" };

/** Estado redundante: color, texto e ícono, nunca solo color (RNF-1.2). */
export function CameraStatusBadge({ status }: { status: CameraStatus | undefined }) {
  const value = status ?? "OFFLINE";
  const { text, icon } = CAMERA_STATUS[value];
  return (
    <span className={`status ${value}`}>
      <span aria-hidden="true">{icon}</span>
      {text}
    </span>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus | undefined }) {
  const value = status ?? "NEW";
  return (
    <span className={`status ${value}`}>
      <span aria-hidden="true">{REPORT_ICON[value]}</span>
      {REPORT_STATUS[value]}
    </span>
  );
}
