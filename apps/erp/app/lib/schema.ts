import {
  pgTable,
  serial,
  varchar,
  integer,
  date,
  boolean,
  text,
  decimal,
  time,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── ADDRESS TYPES ──────────────────────────────────────────────────────────

/** Structured address stored as JSONB in students.address */
export interface StudentCurrentAddress {
  line1: string;   // Street / locality / hostel name
  city: string;
  pincode: string; // Exactly 6 digits
  kind: "home" | "hostel" | "pg" | "relative";
}

export interface StudentHomeAddress {
  line1: string;
  city: string;
  pincode: string; // Exactly 6 digits
}

/**
 * Top-level JSONB shape for students.address.
 * `home` is required when current.kind is "hostel" or "pg".
 */
export interface StudentAddress {
  current: StudentCurrentAddress;
  home?: StudentHomeAddress;
}

/** Structured address stored as JSONB in faculty.address */
export interface FacultyAddress {
  line1: string;
  city: string;
  pincode: string; // Exactly 6 digits
  kind: "home" | "other";
}

// -- CORE LOOKUP / MASTER TABLES --

export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 20 }).notNull().unique(),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  totalSems: integer("total_sems").notNull().default(6),
});

export const semesters = pgTable("semesters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  academicYearId: integer("academic_year_id").references(() => academicYears.id),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(), // flexible: "101", "BCA101", "301-01"
  shortCode: varchar("short_code", { length: 20 }), // e.g. "DL", "TABLUE"
  subjectType: varchar("subject_type", { length: 20 }).notNull(), // "theory" | "practical" | "both"
  credit: integer("credit"),
  semester: integer("semester"),
  courseId: integer("course_id").references(() => courses.id),

  // Marking scheme — required fields depend on subjectType
  internalTheoryMax: integer("internal_theory_max"),
  externalTheoryMax: integer("external_theory_max"),
  theoryPassingMarks: integer("theory_passing_marks"),
  internalPracticalMax: integer("internal_practical_max"),
  externalPracticalMax: integer("external_practical_max"),
  practicalPassingMarks: integer("practical_passing_marks"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // "student" | "faculty" | "counselor" | "hod"
});

// -- ROOMS --

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g. "LAB-1"
  name: varchar("name", { length: 150 }).notNull(),
  isLab: boolean("is_lab").notNull().default(false),
  capacity: integer("capacity"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- DIVISIONS --

export const divisions = pgTable("divisions", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  courseCode: varchar("course_code", { length: 20 }).notNull(),
  courseName: varchar("course_name", { length: 100 }).notNull(),
  specialization: varchar("specialization", { length: 20 }).notNull(), // "AI" | "DS" | "REGULAR"
  batchYear: integer("batch_year").notNull(),
  semesterNo: integer("semester_no").notNull(),
  divisionNo: integer("division_no").notNull(),
  displayName: varchar("display_name", { length: 50 }).notNull(), // permanent: e.g. "26BCAAIDIV1"
  maxCapacity: integer("max_capacity").notNull().default(60),
  publishStatus: varchar("publish_status", { length: 20 }).notNull().default("draft"), // "draft" | "published"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("divisions_batch_divno_idx").on(t.batchYear, t.divisionNo),
  index("divisions_batch_spec_idx").on(t.batchYear, t.specialization),
]);

// -- FACULTY --

export const faculty = pgTable("faculty", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => courses.id),
  facultyCode: varchar("faculty_code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  mobile: varchar("mobile", { length: 15 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  mustChangePwd: boolean("must_change_pwd").notNull().default(true),
  gender: varchar("gender", { length: 10 }),
  dob: date("dob"),
  /** Structured address — see FacultyAddress interface */
  address: jsonb("address").$type<FacultyAddress>(),
  alternateMobile: varchar("alternate_mobile", { length: 15 }),
  profilePhotoUrl: varchar("profile_photo_url", { length: 255 }),
  qualification: varchar("qualification", { length: 100 }),
  experienceYears: integer("experience_years"),
  specialization: varchar("specialization", { length: 150 }),
  designation: varchar("designation", { length: 100 }),
  profileCompletion: varchar("profile_completion", { length: 20 }).notNull().default("incomplete"), // "incomplete" | "complete"
  profileStep: integer("profile_step").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const facultyRoles = pgTable("faculty_roles", {
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
  roleId: integer("role_id").notNull().references(() => roles.id),
}, (t) => [
  primaryKey({ columns: [t.facultyId, t.roleId] })
]);

// -- STUDENTS --

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  tempId: varchar("temp_id", { length: 30 }).unique(),
  studentId: varchar("student_id", { length: 20 }).unique(),
  spid: varchar("spid", { length: 30 }).unique(),
  enrollmentId: varchar("enrollment_id", { length: 30 }).unique(),
  abcId: varchar("abc_id", { length: 30 }).unique(),

  fullName: varchar("full_name", { length: 150 }).notNull(),
  dob: date("dob"),
  gender: varchar("gender", { length: 10 }),
  bloodGroup: varchar("blood_group", { length: 5 }),
  email: varchar("email", { length: 150 }).notNull().unique(),
  mobile: varchar("mobile", { length: 15 }).unique(),
  parentMobile: varchar("parent_mobile", { length: 15 }),
  optionalMobile: varchar("optional_mobile", { length: 15 }),
  /** Structured address — see StudentAddress interface */
  address: jsonb("address").$type<StudentAddress>(),
  aadhaarStudent: varchar("aadhaar_student", { length: 20 }),
  aadhaarParent: varchar("aadhaar_parent", { length: 20 }),

  courseId: integer("course_id").notNull().references(() => courses.id),
  category: varchar("category", { length: 10 }), // "SC","ST","OBC","Open"
  board: varchar("board", { length: 20 }), // "GSEB","CBSE"
  twelfthPercent: decimal("twelfth_percent", { precision: 5, scale: 2 }),
  twelfthStream: varchar("twelfth_stream", { length: 50 }),
  schoolName: varchar("school_name", { length: 200 }),
  udiseCode: varchar("udise_code", { length: 20 }),

  entryType: varchar("entry_type", { length: 20 }).notNull().default("fresh"),
  entrySemesterNo: integer("entry_semester_no").notNull().default(1),

  currentSemesterNo: integer("current_semester_no"),
  currentDivisionId: integer("current_division_id").references(() => divisions.id),
  currentDivisionName: varchar("current_division_name", { length: 50 }),

  status: varchar("status", { length: 20 }).notNull().default("incomplete"), // "incomplete" | "pending" | "approved" | "rejected"
  passwordHash: varchar("password_hash", { length: 255 }),
  profilePhoto: varchar("profile_photo", { length: 255 }),
  profileStep: integer("profile_step").notNull().default(1),       // current stepper step (1–5)
  profileStatus: varchar("profile_status", { length: 20 }).notNull().default("incomplete"), // "incomplete" | "complete"

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- STUDENT ENROLLMENT HISTORY --

export const studentEnrollmentHistory = pgTable("student_enrollment_history", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | archived | graduated
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (t) => [
  uniqueIndex("seh_student_semester_idx").on(t.studentId, t.semesterId),
  index("seh_student_status_idx").on(t.studentId, t.status),
  index("seh_division_idx").on(t.divisionId),
]);

export const studentDocuments = pgTable("student_documents", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  docType: varchar("doc_type", { length: 50 }).notNull(),
  filePath: varchar("file_path", { length: 255 }).notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const studentPriorEducation = pgTable("student_prior_education", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().unique().references(() => students.id),
  prevInstitution: varchar("prev_institution", { length: 200 }).notNull(),
  prevCourse: varchar("prev_course", { length: 100 }).notNull(),
  prevEnrollmentNo: varchar("prev_enrollment_no", { length: 50 }),
  semestersCompleted: integer("semesters_completed").notNull(),
  reasonForTransfer: text("reason_for_transfer"),
});

// -- FACULTY ASSIGNMENTS --

export const facultySubjectAssignments = pgTable("faculty_subject_assignments", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  subjectType: varchar("subject_type", { length: 20 }).notNull(),
}, (t) => [
  uniqueIndex("fsa_sem_fac_sub_div_idx").on(t.semesterId, t.facultyId, t.subjectId, t.divisionId)
]);

export const counselorDivisionAssignments = pgTable("counselor_division_assignments", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
}, (t) => [
  uniqueIndex("cda_sem_fac_div_idx").on(t.semesterId, t.facultyId, t.divisionId)
]);

// -- TIMETABLE --

export const timetableSlots = pgTable("timetable_slots", {
  id: serial("id").primaryKey(),
  slotNumber: integer("slot_number").notNull().unique(),    // 1, 2, 3...
  label: varchar("label", { length: 30 }).notNull(),        // "Slot 1", "Break"
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isBreak: boolean("is_break").notNull().default(false),    // true for recess/lunch
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const timetableEntries = pgTable("timetable_entries", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  assignmentId: integer("assignment_id").notNull().references(() => facultySubjectAssignments.id),

  dayOfWeek: varchar("day_of_week", { length: 10 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  slotId: integer("slot_id").references(() => timetableSlots.id), // nullable for backward compat

  color: varchar("color", { length: 20 }).default("#6366f1"), // optional color for visual grouping
  isLab: boolean("is_lab").notNull().default(false),
  labId: varchar("lab_id", { length: 20 }), // LAB1, LAB2, LAB3, LAB4

  // Timetable publishing & versioning
  isActive: boolean("is_active").notNull().default(true),
  publishId: varchar("publish_id", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("te_div_day_start_sem_idx").on(t.divisionId, t.dayOfWeek, t.startTime, t.semesterId),
  index("te_assign_sem_idx").on(t.assignmentId, t.semesterId),
  index("te_active_idx").on(t.isActive),
  index("te_slot_idx").on(t.slotId),
]);


// -- MARKS --

export const marks = pgTable("marks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  assignmentId: integer("assignment_id").notNull().references(() => facultySubjectAssignments.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),

  internalTheory: decimal("internal_theory", { precision: 6, scale: 2 }),
  externalTheory: decimal("external_theory", { precision: 6, scale: 2 }),
  internalPractical: decimal("internal_practical", { precision: 6, scale: 2 }),
  externalPractical: decimal("external_practical", { precision: 6, scale: 2 }),

  maxInternalTheory: decimal("max_internal_theory", { precision: 6, scale: 2 }),
  maxExternalTheory: decimal("max_external_theory", { precision: 6, scale: 2 }),
  maxInternalPractical: decimal("max_internal_practical", { precision: 6, scale: 2 }),
  maxExternalPractical: decimal("max_external_practical", { precision: 6, scale: 2 }),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("marks_student_assign_sem_idx").on(t.studentId, t.assignmentId, t.semesterId),
  index("marks_assign_sem_idx").on(t.assignmentId, t.semesterId)
]);

// -- STUDENT REQUESTS --

export const studentRequests = pgTable("student_requests", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  targetFacultyId: integer("target_faculty_id").notNull().references(() => faculty.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),

  requestType: varchar("request_type", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  remarks: text("remarks"),

  attachmentUrl: varchar("attachment_url", { length: 500 }),
  attachmentType: varchar("attachment_type", { length: 50 }),
  attachmentSize: integer("attachment_size"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("sr_student_sem_idx").on(t.studentId, t.semesterId),
  index("sr_targetfac_status_idx").on(t.targetFacultyId, t.status)
]);

// -- AUDIT LOGS --

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userType: varchar("user_type", { length: 20 }).notNull(),
  userName: varchar("user_name", { length: 150 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("al_module_entity_idx").on(t.module, t.entityType, t.entityId),
  index("al_user_time_idx").on(t.userId, t.userType, t.createdAt),
  index("al_time_idx").on(t.createdAt)
]);

// -- CIRCULARS / NOTICES --

export const circulars = pgTable("circulars", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  attachmentType: varchar("attachment_type", { length: 50 }),
  attachmentSize: integer("attachment_size"),

  // targetType drives visibility:
  //  "ALL"      — every authenticated user
  //  "FACULTY"  — only faculty / counselor / hod accounts
  //  "YEAR"     — students in a specific academic year (1-4)
  //  "DIVISION" — specific divisions listed in circular_recipients
  targetType: varchar("target_type", { length: 20 }).notNull().default("ALL"),
  targetYear: integer("target_year"),

  facultyId: integer("faculty_id").references(() => faculty.id),
  adminId: integer("admin_id").references(() => administrators.id),
  facultyName: varchar("faculty_name", { length: 150 }).notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("circ_target_idx").on(t.targetType, t.targetYear),
  index("circ_faculty_idx").on(t.facultyId),
  index("circ_admin_idx").on(t.adminId),
  index("circ_created_idx").on(t.createdAt),
]);

// Join table for division-targeted circulars (supports multiple divisions per circular)
export const circularRecipients = pgTable("circular_recipients", {
  id: serial("id").primaryKey(),
  circularId: integer("circular_id").notNull().references(() => circulars.id, { onDelete: "cascade" }),
  divisionId: integer("division_id").notNull().references(() => divisions.id, { onDelete: "cascade" }),
}, (t) => [
  uniqueIndex("circ_div_unique_idx").on(t.circularId, t.divisionId),
  index("circ_div_circ_idx").on(t.circularId),
  index("circ_div_div_idx").on(t.divisionId),
]);


// -- INTERNAL EXAMS --

export const internalExams = pgTable("internal_exams", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  examName: varchar("exam_name", { length: 100 }).notNull(),
  examNumber: integer("exam_number").notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull().default("ALL"), // "ALL" | "YEAR" | "DIVISION"
  targetYear: integer("target_year"),
  targetDivisionId: integer("target_division_id").references(() => divisions.id),
  createdByFacultyId: integer("created_by_faculty_id").notNull().references(() => faculty.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("ie_sem_idx").on(t.semesterId),
  index("ie_sem_num_idx").on(t.semesterId, t.examNumber)
]);

export const internalExamMarks = pgTable("internal_exam_marks", {
  id: serial("id").primaryKey(),
  internalExamId: integer("internal_exam_id").notNull().references(() => internalExams.id, { onDelete: "cascade" }),
  assignmentId: integer("assignment_id").notNull().references(() => facultySubjectAssignments.id),
  studentId: integer("student_id").notNull().references(() => students.id),

  theoryMarks: decimal("theory_marks", { precision: 6, scale: 2 }),
  practicalMarks: decimal("practical_marks", { precision: 6, scale: 2 }),

  isDraft: boolean("is_draft").notNull().default(true),
  isVisible: boolean("is_visible").notNull().default(false),

  updatedByFacultyId: integer("updated_by_faculty_id").references(() => faculty.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("iem_exam_assign_student_idx").on(t.internalExamId, t.assignmentId, t.studentId),
  index("iem_assign_exam_idx").on(t.assignmentId, t.internalExamId),
  index("iem_student_idx").on(t.studentId)
]);

export const internalEvaluations = pgTable("internal_evaluations", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => facultySubjectAssignments.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),

  finalTheoryMarks: decimal("final_theory_marks", { precision: 6, scale: 2 }),
  finalPracticalMarks: decimal("final_practical_marks", { precision: 6, scale: 2 }),
  isFinalized: boolean("is_finalized").notNull().default(false),

  finalizedByFacultyId: integer("finalized_by_faculty_id").references(() => faculty.id),
  finalizedAt: timestamp("finalized_at"),
  updatedByFacultyId: integer("updated_by_faculty_id").references(() => faculty.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("iev_assign_student_sem_idx").on(t.assignmentId, t.studentId, t.semesterId),
  index("iev_assign_sem_idx").on(t.assignmentId, t.semesterId)
]);

export const attendanceSessionLedger = pgTable("attendance_session_ledger", {
  id: serial("id").primaryKey(),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  absentStudentIds: integer("absent_student_ids").array().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("asl_absent_ids_gin_idx").using("gin", t.absentStudentIds),
  index("asl_div_date_idx").on(t.divisionId, t.date),
]);

export const attendanceAnalyticsSummary = pgTable("attendance_analytics_summary", {
  studentId: integer("student_id").notNull().references(() => students.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  semesterId: integer("semester_id").notNull().references(() => semesters.id),
  presentCount: integer("present_count").notNull().default(0),
  totalLectures: integer("total_lectures").notNull().default(0),
  attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }).notNull().default("0.00"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.studentId, t.divisionId, t.semesterId] }),
  index("aas_div_pct_idx").on(t.divisionId, t.attendancePercentage),
]);

// -- NOTIFICATIONS MIGRATED TO CONVEX --

export const administrators = pgTable("administrators", {
  id: serial("id").primaryKey(),
  adminCode: varchar("admin_code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  mobile: varchar("mobile", { length: 15 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  mustChangePwd: boolean("must_change_pwd").notNull().default(true),
  designation: varchar("designation", { length: 100 }).notNull(), // "principal" | "vice_principal"
  gender: varchar("gender", { length: 10 }),
  dob: date("dob"),
  address: jsonb("address").$type<FacultyAddress>(),
  alternateMobile: varchar("alternate_mobile", { length: 15 }),
  profilePhotoUrl: varchar("profile_photo_url", { length: 255 }),
  qualification: varchar("qualification", { length: 100 }),
  experienceYears: integer("experience_years"),
  specialization: varchar("specialization", { length: 150 }),
  profileCompletion: varchar("profile_completion", { length: 20 }).notNull().default("incomplete"), // "incomplete" | "complete"
  profileStep: integer("profile_step").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── FACULTY APPROVAL SYSTEM TABLES ───

export const facultyRequestTypes = pgTable("faculty_request_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // "leave_approval", "work_from_home"
  name: varchar("name", { length: 100 }).notNull(),        // "Leave Approval", "Work From Home"
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const facultyApprovalConfigs = pgTable("faculty_approval_configs", {
  id: serial("id").primaryKey(),
  requestTypeCode: varchar("request_type_code", { length: 50 }).notNull().unique().references(() => facultyRequestTypes.code),
  approvalChain: jsonb("approval_chain").$type<string[]>().notNull(), // e.g. ["HOD", "PRINCIPAL"] stored as JSON
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const facultyRequests = pgTable("faculty_requests", {
  id: serial("id").primaryKey(),
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
  requestTypeCode: varchar("request_type_code", { length: 50 }).notNull().references(() => facultyRequestTypes.code),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "approved" | "rejected"
  currentStepIndex: integer("current_step_index").notNull().default(0),    // index of active approval in chain
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const facultyRequestDocuments = pgTable("faculty_request_documents", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => facultyRequests.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: integer("file_size"), // in bytes
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const facultyRequestApprovals = pgTable("faculty_request_approvals", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => facultyRequests.id, { onDelete: "cascade" }),
  approverRole: varchar("approver_role", { length: 50 }).notNull(),       // "HOD", "PRINCIPAL", "VICE_PRINCIPAL"
  approverUserId: integer("approver_user_id").references(() => faculty.id), // resolved when actual action is taken
  status: varchar("status", { length: 20 }).notNull().default("pending"),  // "pending" | "approved" | "rejected"
  remarks: text("remarks"),
  sequenceOrder: integer("sequence_order").notNull(),                     // 0-indexed position in the chain
  actionedAt: timestamp("actioned_at"),
});

export const facultyRequestProxies = pgTable("faculty_request_proxies", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => facultyRequests.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  slotId: integer("slot_id").notNull().references(() => timetableSlots.id),
  originalFacultyId: integer("original_faculty_id").notNull().references(() => faculty.id),
  senderProxyFacultyId: integer("sender_proxy_faculty_id").references(() => faculty.id), // Persist original proxy selection from sender
  proxyFacultyId: integer("proxy_faculty_id").notNull().references(() => faculty.id),
  divisionId: integer("division_id").notNull().references(() => divisions.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "approved" | "overridden"
  overriddenBy: integer("overridden_by").references(() => faculty.id),    // HOD or Principal user ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});



