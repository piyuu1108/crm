import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  pgEnum,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────
export const adminRoleEnum = pgEnum("admin_role", [
  "HOD",
  "Principal",
  "VicePrincipal",
]);

export const subjectTypeEnum = pgEnum("subject_type", [
  "Theory",
  "Practical",
  "Both",
  "ProjectMinor",
  "ProjectMajor",
]);

// ─── Admins ───────────────────────────────────────────────────────────
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: adminRoleEnum("role").notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Courses ──────────────────────────────────────────────────────────
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  specializations: many(specializations),
  faculty: many(faculty),
  subjects: many(subjects),
  classes: many(classes),
}));

// ─── Specializations ─────────────────────────────────────────────────
export const specializations = pgTable("specializations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  shortCode: varchar("short_code", { length: 10 }).notNull().unique(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const specializationsRelations = relations(
  specializations,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [specializations.courseId],
      references: [courses.id],
    }),
    classes: many(classes),
  })
);

// ─── Settings ─────────────────────────────────────────────────────────
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
});

// ─── Faculty ──────────────────────────────────────────────────────────
export const faculty = pgTable("faculty", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const facultyRelations = relations(faculty, ({ one, many }) => ({
  course: one(courses, {
    fields: [faculty.courseId],
    references: [courses.id],
  }),
  assignments: many(assignments),
}));

// ─── Subjects ─────────────────────────────────────────────────────────
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortCode: varchar("short_code", { length: 20 }).notNull(),
  credit: integer("credit").notNull(),
  type: subjectTypeEnum("type").notNull(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  semester: integer("semester").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  course: one(courses, {
    fields: [subjects.courseId],
    references: [courses.id],
  }),
  assignments: many(assignments),
}));

// ─── Classes ──────────────────────────────────────────────────────────
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  year: integer("year").notNull(),
  semester: integer("semester").notNull(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  specializationId: integer("specialization_id")
    .notNull()
    .references(() => specializations.id, { onDelete: "cascade" }),
  divisionNumber: integer("division_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classesRelations = relations(classes, ({ one, many }) => ({
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
  specialization: one(specializations, {
    fields: [classes.specializationId],
    references: [specializations.id],
  }),
  assignments: many(assignments),
}));

// ─── Assignments ──────────────────────────────────────────────────────
export const assignments = pgTable(
  "assignments",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    facultyId: integer("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("uniq_assignment").on(t.subjectId, t.classId)]
);

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [assignments.subjectId],
    references: [subjects.id],
  }),
  class: one(classes, {
    fields: [assignments.classId],
    references: [classes.id],
  }),
  faculty: one(faculty, {
    fields: [assignments.facultyId],
    references: [faculty.id],
  }),
  labSessions: many(labSessions),
}));

// ─── Rooms ────────────────────────────────────────────────────────────
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  isLab: boolean("is_lab").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roomsRelations = relations(rooms, ({ many }) => ({
  labSessions: many(labSessions),
}));

// ─── Lab Sessions ─────────────────────────────────────────────────────
export const sessionTypeEnum = pgEnum("session_type", ["Theory", "Lab"]);

export const labSessions = pgTable("lab_sessions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  sessionType: sessionTypeEnum("session_type").notNull(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  durationSlots: integer("duration_slots").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labSessionsRelations = relations(labSessions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [labSessions.assignmentId],
    references: [assignments.id],
  }),
  room: one(rooms, {
    fields: [labSessions.roomId],
    references: [rooms.id],
  }),
}));

// ─── Timetables ───────────────────────────────────────────────────────
export const timetables = pgTable(
  "timetables",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    day: varchar("day", { length: 20 }).notNull(),
    slot: varchar("slot", { length: 20 }).notNull(),
    assignmentId: integer("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    facultyId: integer("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    isLabSession: boolean("is_lab_session").notNull().default(false),
    labId: integer("lab_id").references(() => rooms.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    unique("uniq_class_day_slot").on(t.classId, t.day, t.slot),
  ]
);

export const timetablesRelations = relations(timetables, ({ one }) => ({
  course: one(courses, {
    fields: [timetables.courseId],
    references: [courses.id],
  }),
  class: one(classes, {
    fields: [timetables.classId],
    references: [classes.id],
  }),
  assignment: one(assignments, {
    fields: [timetables.assignmentId],
    references: [assignments.id],
  }),
  subject: one(subjects, {
    fields: [timetables.subjectId],
    references: [subjects.id],
  }),
  faculty: one(faculty, {
    fields: [timetables.facultyId],
    references: [faculty.id],
  }),
  lab: one(rooms, {
    fields: [timetables.labId],
    references: [rooms.id],
  }),
}));
