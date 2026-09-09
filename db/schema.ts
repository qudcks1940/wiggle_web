import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () => text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () => text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  credentialHash: text("credential_hash"),
  credentialSalt: text("credential_salt"),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("teachers_email_uq").on(table.email)]);

export const teacherSessions = sqliteTable("teacher_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  lastUsedAt: text("last_used_at").notNull(),
  createdAt: createdAt(),
}, (table) => [index("teacher_sessions_teacher_idx").on(table.teacherId, table.expiresAt)]);

export const classrooms = sqliteTable("classrooms", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id),
  displayName: text("display_name").notNull(),
  classCode: text("class_code").notNull(),
  joinToken: text("join_token").notNull(),
  admissionOpen: integer("admission_open", { mode: "boolean" }).notNull().default(true),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  currentActivity: text("current_activity").notNull().default("자유롭게 그리기"),
  // 학급 포인터 — 지금 어떤 아크의 어느 회차인가 (AD-9). 아이의 진행 상태는 넣지 않는다.
  currentArcId: text("current_arc_id"),
  currentEpisodeId: text("current_episode_id"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("classrooms_code_uq").on(table.classCode),
  uniqueIndex("classrooms_join_token_uq").on(table.joinToken),
]);

/* 교사가 학급을 만들 때 명단(번호 + 실명)을 미리 채운다.
 * - seatNumber/realName: 교사 전용. 학생 화면·가족 공유·그림책·AI 요청에 실리지 않는다.
 * - claimedAt: 그 자리에 아이가 처음 들어온 시각. null이면 아직 아무도 쓰지 않은 자리다.
 * - nickname/animal: 아이가 첫 입장 때 직접 고른다. 아이 화면에는 이 이름만 보인다.
 * 기존 학생 행은 seatNumber/realName이 없고 claimedAt이 채워진 것처럼 동작한다. */
export const studentProfiles = sqliteTable("student_profiles", {
  id: text("id").primaryKey(),
  classroomId: text("classroom_id").notNull().references(() => classrooms.id),
  seatNumber: integer("seat_number"),
  realName: text("real_name"),
  claimedAt: text("claimed_at"),
  nickname: text("nickname").notNull(),
  animal: text("animal").notNull(),
  lastActivityAt: text("last_activity_at").notNull(),
  archivedAt: text("archived_at"),
  createdAt: createdAt(),
}, (table) => [
  index("students_classroom_idx").on(table.classroomId, table.lastActivityAt),
  index("students_classroom_archived_idx").on(table.classroomId, table.archivedAt, table.nickname),
  // 같은 학급에서 번호는 하나뿐이다. 빠진 학생(archived)의 번호는 다시 쓸 수 있어야 하므로 제외한다.
  uniqueIndex("students_classroom_seat_uq").on(table.classroomId, table.seatNumber).where(sql`seat_number IS NOT NULL AND archived_at IS NULL`),
]);

export const recoveryCredentials = sqliteTable("recovery_credentials", {
  studentId: text("student_id").primaryKey().references(() => studentProfiles.id, { onDelete: "cascade" }),
  pictureHash: text("picture_hash").notNull(),
  pictureSalt: text("picture_salt").notNull(),
  personalQrHash: text("personal_qr_hash").notNull(),
  resetAt: text("reset_at"),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("recovery_personal_qr_uq").on(table.personalQrHash)]);

export const deviceSessions = sqliteTable("device_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  lastUsedAt: text("last_used_at").notNull(),
  revokedAt: text("revoked_at"),
  createdAt: createdAt(),
}, (table) => [index("device_sessions_student_idx").on(table.studentId, table.expiresAt)]);

export const artworks = sqliteTable("artworks", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => studentProfiles.id),
  classroomId: text("classroom_id").notNull().references(() => classrooms.id),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  learningMode: text("learning_mode", { enum: ["practice", "guided", "observe", "free"] }).notNull(),
  lessonSlug: text("lesson_slug"),
  // 회차 귀속 — 생성 시점에 고정, 어떤 쓰기도 학급 포인터로 재결정하지 않는다 (AD-10)
  arcId: text("arc_id"),
  episodeId: text("episode_id"),
  arcVersion: integer("arc_version"),
  guideVariant: integer("guide_variant").notNull().default(0),
  intent: text("intent").notNull().default(""),
  opsJson: text("ops_json").notNull().default("[]"),
  schemaVersion: integer("schema_version").notNull().default(1),
  rendererVersion: integer("renderer_version").notNull().default(1),
  revision: integer("revision").notNull().default(0),
  currentStep: integer("current_step").notNull().default(0),
  versionCount: integer("version_count").notNull().default(0),
  status: text("status", { enum: ["drawing", "reflecting", "complete"] }).notNull().default("drawing"),
  thumbnailKey: text("thumbnail_key"),
  finalImageKey: text("final_image_key"),
  lastMutationId: text("last_mutation_id"),
  completedAt: text("completed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("artworks_student_idx").on(table.studentId, table.updatedAt),
  index("artworks_classroom_idx").on(table.classroomId, table.updatedAt),
]);

export const artworkVersions = sqliteTable("artwork_versions", {
  id: text("id").primaryKey(),
  artworkId: text("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  opsJson: text("ops_json").notNull(),
  imageKey: text("image_key"),
  reason: text("reason").notNull(),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("artwork_versions_artwork_sequence_uq").on(table.artworkId, table.sequence)]);

export const storybooks = sqliteTable("storybooks", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  classroomId: text("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  documentJson: text("document_json").notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  revision: integer("revision").notNull().default(0),
  status: text("status", { enum: ["draft", "complete"] }).notNull().default("draft"),
  lastMutationId: text("last_mutation_id"),
  completedAt: text("completed_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("storybooks_student_idx").on(table.studentId, table.updatedAt),
  index("storybooks_classroom_idx").on(table.classroomId, table.updatedAt),
]);

export const storybookAssets = sqliteTable("storybook_assets", {
  id: text("id").primaryKey(),
  storybookId: text("storybook_id").notNull().references(() => storybooks.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  sourceType: text("source_type", { enum: ["artwork", "upload"] }).notNull(),
  sourceArtworkId: text("source_artwork_id").references(() => artworks.id, { onDelete: "set null" }),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  createdAt: createdAt(),
}, (table) => [
  index("storybook_assets_book_idx").on(table.storybookId, table.createdAt),
  index("storybook_assets_student_idx").on(table.studentId, table.createdAt),
]);

export const storybookMutations = sqliteTable("storybook_mutations", {
  requestId: text("request_id").notNull(),
  storybookId: text("storybook_id").notNull().references(() => storybooks.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  resultRevision: integer("result_revision").notNull(),
  createdAt: createdAt(),
}, (table) => [
  primaryKey({ columns: [table.storybookId, table.studentId, table.requestId] }),
  index("storybook_mutations_book_idx").on(table.storybookId, table.createdAt),
]);

export const storybookFeedbackRequests = sqliteTable("storybook_feedback_requests", {
  id: text("id").primaryKey(),
  storybookId: text("storybook_id").notNull().references(() => storybooks.id, { onDelete: "cascade" }),
  classroomId: text("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["waiting_rubric", "queued", "processing", "complete", "failed"] }).notNull().default("waiting_rubric"),
  rubricVersion: text("rubric_version"),
  feedbackJson: text("feedback_json"),
  requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("storybook_feedback_book_teacher_uq").on(table.storybookId, table.teacherId),
  index("storybook_feedback_classroom_idx").on(table.classroomId, table.status, table.requestedAt),
]);

export const coachingEvents = sqliteTable("coaching_events", {
  id: text("id").primaryKey(),
  artworkId: text("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  actor: text("actor", { enum: ["teacher", "ai"] }).notNull(),
  question: text("question").notNull(),
  studentAnswer: text("student_answer"),
  appliedHint: text("applied_hint"),
  beforeVersionId: text("before_version_id"),
  afterVersionId: text("after_version_id"),
  createdAt: createdAt(),
});

export const coachingEventDetails = sqliteTable("coaching_event_details", {
  eventId: text("event_id").primaryKey().references(() => coachingEvents.id, { onDelete: "cascade" }),
  // "guide"는 은퇴한 단계 가이드(2026-09-09)의 옛 행이다. 새로 쓰지는 않지만
  // 이미 저장된 기록을 읽어야 하므로 enum에서 빼지 않는다.
  responseKind: text("response_kind", { enum: ["question", "guide"] }).notNull(),
  choicesJson: text("choices_json").notNull().default("[]"),
  guideStepsJson: text("guide_steps_json").notNull().default("[]"),
  newElementsJson: text("new_elements_json").notNull().default("[]"),
  growthEvent: text("growth_event"),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status", { enum: ["open", "active", "answered", "dismissed", "completed"] }).notNull().default("open"),
  updatedAt: updatedAt(),
}, (table) => [index("coaching_details_status_idx").on(table.status, table.updatedAt)]);

export const artworkMutations = sqliteTable("artwork_mutations", {
  requestId: text("request_id").notNull(),
  artworkId: text("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  resultRevision: integer("result_revision").notNull(),
  createdAt: createdAt(),
}, (table) => [
  primaryKey({ columns: [table.artworkId, table.studentId, table.requestId] }),
  index("artwork_mutations_artwork_idx").on(table.artworkId, table.createdAt),
]);

export const reflections = sqliteTable("reflections", {
  artworkId: text("artwork_id").primaryKey().references(() => artworks.id, { onDelete: "cascade" }),
  favoritePart: text("favorite_part").notNull(),
  favoriteReason: text("favorite_reason").notNull(),
  spokenDescription: text("spoken_description").notNull().default(""),
  storyText: text("story_text").notNull().default(""),
  nextSuggestion: text("next_suggestion").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const teacherMessages = sqliteTable("teacher_messages", {
  id: text("id").primaryKey(),
  classroomId: text("classroom_id").notNull().references(() => classrooms.id),
  studentId: text("student_id").references(() => studentProfiles.id),
  teacherId: text("teacher_id").notNull().references(() => teachers.id),
  body: text("body").notNull(),
  referenceUrl: text("reference_url"),
  createdAt: createdAt(),
}, (table) => [index("messages_classroom_idx").on(table.classroomId, table.createdAt)]);

export const messageReceipts = sqliteTable("message_receipts", {
  messageId: text("message_id").notNull().references(() => teacherMessages.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  seenAt: text("seen_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.messageId, table.studentId] }),
  index("message_receipts_student_idx").on(table.studentId, table.seenAt),
]);

export const teacherViews = sqliteTable("teacher_views", {
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  classroomId: text("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  updatedAt: updatedAt(),
}, (table) => [
  primaryKey({ columns: [table.teacherId, table.studentId] }),
  index("teacher_views_student_idx").on(table.studentId, table.expiresAt),
]);

export const teacherCoachingDrafts = sqliteTable("teacher_coaching_drafts", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  classroomId: text("classroom_id").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  artworkId: text("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  observation: text("observation").notNull(),
  nextAction: text("next_action").notNull(),
  model: text("model").notNull(),
  status: text("status", { enum: ["draft", "approved"] }).notNull().default("draft"),
  approvedMessageId: text("approved_message_id").references(() => teacherMessages.id),
  approvedAt: text("approved_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("teacher_drafts_owner_idx").on(table.teacherId, table.classroomId, table.createdAt),
  index("teacher_drafts_student_idx").on(table.studentId, table.createdAt),
]);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowEndsAt: text("window_ends_at").notNull(),
});

export const familyShareLinks = sqliteTable("family_share_links", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  scope: text("scope", { enum: ["artwork", "bundle"] }).notNull(),
  approvalKind: text("approval_kind", { enum: ["guardian"] }).notNull(),
  guardianConsentAt: text("guardian_consent_at").notNull(),
  consentMethod: text("consent_method", { enum: ["paper", "in_person", "phone", "school_portal"] }).notNull(),
  attestedByTeacherId: text("attested_by_teacher_id").notNull().references(() => teachers.id),
  reportStartAt: text("report_start_at").notNull(),
  reportEndAt: text("report_end_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("family_share_teacher_idx").on(table.teacherId, table.createdAt),
  index("family_share_student_idx").on(table.studentId, table.expiresAt),
]);

export const familyShareInvites = sqliteTable("family_share_invites", {
  tokenHash: text("token_hash").primaryKey(),
  linkId: text("link_id").notNull().references(() => familyShareLinks.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["initial", "handoff"] }).notNull(),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  consumedSessionHash: text("consumed_session_hash"),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("family_invite_session_uq").on(table.consumedSessionHash),
  index("family_invite_link_idx").on(table.linkId, table.expiresAt),
]);

export const familyShareSessions = sqliteTable("family_share_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  linkId: text("link_id").notNull().references(() => familyShareLinks.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  lastUsedAt: text("last_used_at").notNull(),
  createdAt: createdAt(),
}, (table) => [index("family_session_link_idx").on(table.linkId, table.expiresAt)]);

export const familyShareArtworks = sqliteTable("family_share_artworks", {
  linkId: text("link_id").notNull().references(() => familyShareLinks.id, { onDelete: "cascade" }),
  artworkId: text("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  approvedAt: text("approved_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.linkId, table.artworkId] }),
  uniqueIndex("family_share_position_uq").on(table.linkId, table.position),
  index("family_share_artwork_idx").on(table.artworkId),
]);

export const subscriptionEntitlements = sqliteTable("subscription_entitlements", {
  teacherId: text("teacher_id").primaryKey().references(() => teachers.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull().default("free"),
  status: text("status", { enum: ["disabled", "active", "past_due", "canceled"] }).notNull().default("disabled"),
  provider: text("provider"),
  externalCustomerRef: text("external_customer_ref"),
  externalSubscriptionRef: text("external_subscription_ref"),
  currentPeriodEnd: text("current_period_end"),
  providerEventAt: text("provider_event_at"),
  providerEventId: text("provider_event_id"),
  updatedAt: updatedAt(),
});

export const subscriptionWebhookEvents = sqliteTable("subscription_webhook_events", {
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  occurredAt: text("occurred_at").notNull(),
  signatureVerified: integer("signature_verified", { mode: "boolean" }).notNull(),
  stale: integer("stale", { mode: "boolean" }).notNull().default(false),
  processedAt: text("processed_at"),
  createdAt: createdAt(),
}, (table) => [primaryKey({ columns: [table.provider, table.eventId] })]);
