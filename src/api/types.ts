// Tipos generados desde el contrato OpenAPI del backend (pnpm gen:api).
import type { components } from "./schema";

type Schemas = components["schemas"];
export type CameraView = Schemas["CameraView"];
export type LiveView = Schemas["LiveView"];
export type ZoneView = Schemas["ZoneView"];
export type ZoneDraft = Schemas["ZoneDraft"];
export type ReportView = Schemas["ReportView"];
export type ReportDetail = Schemas["ReportDetail"];
export type ReportPage = Schemas["PagedModelReportView"];
export type ModelVersionView = Schemas["ModelVersionView"];
export type LoginResponse = Schemas["LoginResponse"];
export type AuthenticatedUser = Schemas["AuthenticatedUser"];
export type MfaEnrollment = Schemas["MfaEnrollment"];
export type DetectionSnapshot = Schemas["DetectionSnapshot"];
export type AnalyticsSnapshot = Schemas["AnalyticsSnapshot"];
export type ReportStatus = NonNullable<ReportView["status"]>;
export type DismissalReason = NonNullable<ReportView["dismissalReason"]>;
export type ZoneType = NonNullable<ZoneView["zoneType"]>;
export type CameraStatus = NonNullable<CameraView["displayStatus"]>;
