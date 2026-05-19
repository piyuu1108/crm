import { db } from "@/app/lib/db";
import { students, divisions, semesters, faculty, attendanceSessionLedger, attendanceAnalyticsSummary, studentEnrollmentHistory } from "@/app/lib/schema";
import { submitAttendanceCQRS } from "@/app/lib/integration/attendance-cqrs";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  console.log("=== STARTING FULL END-TO-END CQRS INTEGRATION TEST ===");

  try {
    // 1. Fetch references
    const [facultyMember] = await db.select().from(faculty).limit(1);
    if (!facultyMember) throw new Error("No faculty found.");

    const [division] = await db.select().from(divisions).limit(1);
    if (!division) throw new Error("No divisions found.");

    const [semester] = await db.select().from(semesters).limit(1);
    if (!semester) throw new Error("No semesters found.");

    // Fetch/setup two students in the division
    const activeStudents = await db
      .select({ id: students.id, fullName: students.fullName })
      .from(students)
      .where(eq(students.currentDivisionId, division.id))
      .limit(2);

    if (activeStudents.length < 2) {
      throw new Error(`Please seed at least 2 students in division ${division.displayName}`);
    }

    const student1 = activeStudents[0];
    const student2 = activeStudents[1];
    console.log(`Testing with Student 1: ID=${student1.id} (${student1.fullName})`);
    console.log(`Testing with Student 2: ID=${student2.id} (${student2.fullName})`);

    // Setup enrollment history for accurate joins
    await db.insert(studentEnrollmentHistory)
      .values([
        { studentId: student1.id, semesterId: semester.id, divisionId: division.id, status: "active" },
        { studentId: student2.id, semesterId: semester.id, divisionId: division.id, status: "active" },
      ])
      .onConflictDoNothing();

    // Clear previous sessions and analytics for clean starting numbers
    await db.delete(attendanceSessionLedger).where(
      and(
        eq(attendanceSessionLedger.divisionId, division.id),
        eq(attendanceSessionLedger.semesterId, semester.id)
      )
    );
    await db.delete(attendanceAnalyticsSummary).where(
      and(
        eq(attendanceAnalyticsSummary.divisionId, division.id),
        eq(attendanceAnalyticsSummary.semesterId, semester.id)
      )
    );
    console.log("Cleared existing ledger and analytics for division/semester.");

    // --- STEP 2: Simulate POST /api/attendance/sessions (Check or Create) ---
    console.log("\n--- STEP 2: Checking/Initializing Session ---");
    
    // Check if session exists (should not)
    const [existingBefore] = await db
      .select({ id: attendanceSessionLedger.id })
      .from(attendanceSessionLedger)
      .where(
        and(
          eq(attendanceSessionLedger.divisionId, division.id),
          eq(attendanceSessionLedger.semesterId, semester.id),
          eq(attendanceSessionLedger.date, "2026-05-19"),
          eq(attendanceSessionLedger.startTime, "08:40:00"),
          eq(attendanceSessionLedger.endTime, "09:20:00")
        )
      );
    
    let sessionId: number;
    if (!existingBefore) {
      // Create new session via submitAttendanceCQRS with absentStudentIds: []
      sessionId = await submitAttendanceCQRS({
        semesterId: semester.id,
        divisionId: division.id,
        facultyId: facultyMember.id,
        date: "2026-05-19",
        startTime: "08:40:00",
        endTime: "09:20:00",
        subjectName: "CQRS Distributed Architectures",
        absentStudentIds: [],
      });
      console.log(`Created new session ledger entry. ID: ${sessionId}`);
    } else {
      sessionId = existingBefore.id;
      console.log(`Found existing session ledger entry. ID: ${sessionId}`);
    }

    // --- STEP 3: Simulate POST /api/attendance/save (Mark student1 absent, student2 present) ---
    console.log("\n--- STEP 3: Saving Attendance Diffs ---");
    // Incoming diff: student1 absent, student2 present
    const incomingRecords = [
      { studentId: student1.id, status: "absent" },
      { studentId: student2.id, status: "present" },
    ];

    // Load existing session state
    const [session] = await db
      .select({
        id: attendanceSessionLedger.id,
        absentStudentIds: attendanceSessionLedger.absentStudentIds,
      })
      .from(attendanceSessionLedger)
      .where(eq(attendanceSessionLedger.id, sessionId));

    // Resolve final absent list
    const absentSet = new Set(session.absentStudentIds);
    for (const r of incomingRecords) {
      if (r.status === "absent") {
        absentSet.add(r.studentId);
      } else {
        absentSet.delete(r.studentId);
      }
    }
    const finalAbsentIds = Array.from(absentSet);
    console.log(`Final calculated absent IDs to save:`, finalAbsentIds);

    // Save using submitAttendanceCQRS (should trigger an edit update)
    await submitAttendanceCQRS({
      semesterId: semester.id,
      divisionId: division.id,
      facultyId: facultyMember.id,
      date: "2026-05-19",
      startTime: "08:40:00",
      endTime: "09:20:00",
      subjectName: "CQRS Distributed Architectures",
      absentStudentIds: finalAbsentIds,
    });
    console.log("Saved attendance successfully.");

    // --- STEP 4: Simulate GET /api/attendance/my (Student Self-View) ---
    console.log("\n--- STEP 4: Simulating Student Self-View ---");
    const getMyAttendance = async (studentId: number) => {
      return await db
        .select({
          id: attendanceSessionLedger.id,
          status: sql<string>`case when ${studentId} = any(${attendanceSessionLedger.absentStudentIds}) then 'absent' else 'present' end`,
          subjectName: attendanceSessionLedger.subjectName,
          date: attendanceSessionLedger.date,
        })
        .from(attendanceSessionLedger)
        .leftJoin(
          studentEnrollmentHistory,
          and(
            eq(studentEnrollmentHistory.studentId, studentId),
            eq(studentEnrollmentHistory.divisionId, attendanceSessionLedger.divisionId),
            eq(studentEnrollmentHistory.semesterId, attendanceSessionLedger.semesterId)
          )
        )
        .leftJoin(students, eq(students.id, studentId))
        .where(
          and(
            sql`(${studentEnrollmentHistory.id} is not null or ${students.currentDivisionId} = ${attendanceSessionLedger.divisionId})`,
            eq(attendanceSessionLedger.id, sessionId)
          )
        );
    };

    const s1Records = await getMyAttendance(student1.id);
    const s2Records = await getMyAttendance(student2.id);
    console.log(`Student 1 resolved record status:`, s1Records[0]?.status);
    console.log(`Student 2 resolved record status:`, s2Records[0]?.status);

    if (s1Records[0]?.status !== "absent") throw new Error("Student 1 status should be absent.");
    if (s2Records[0]?.status !== "present") throw new Error("Student 2 status should be present.");
    console.log("STEP 4 Validation: PASSED! ✅");

    // --- STEP 5: Simulate GET /api/dashboard (Student Stats) ---
    console.log("\n--- STEP 5: Simulating Student Dashboard Stats ---");
    const getDashboardStats = async (studentId: number) => {
      const [summary] = await db
        .select({
          presentCount: attendanceAnalyticsSummary.presentCount,
          totalLectures: attendanceAnalyticsSummary.totalLectures,
          attendancePercentage: attendanceAnalyticsSummary.attendancePercentage,
        })
        .from(attendanceAnalyticsSummary)
        .where(
          and(
            eq(attendanceAnalyticsSummary.studentId, studentId),
            eq(attendanceAnalyticsSummary.divisionId, division.id),
            eq(attendanceAnalyticsSummary.semesterId, semester.id)
          )
        )
        .limit(1);
      return summary;
    };

    const s1Stats = await getDashboardStats(student1.id);
    const s2Stats = await getDashboardStats(student2.id);

    console.log(`Student 1 stats: present=${s1Stats?.presentCount}, total=${s1Stats?.totalLectures}, pct=${s1Stats?.attendancePercentage}%`);
    console.log(`Student 2 stats: present=${s2Stats?.presentCount}, total=${s2Stats?.totalLectures}, pct=${s2Stats?.attendancePercentage}%`);

    if (s1Stats?.presentCount !== 0 || s1Stats?.totalLectures !== 1 || Number(s1Stats?.attendancePercentage) !== 0) {
      throw new Error("Student 1 stats incorrect.");
    }
    if (s2Stats?.presentCount !== 1 || s2Stats?.totalLectures !== 1 || Number(s2Stats?.attendancePercentage) !== 100) {
      throw new Error("Student 2 stats incorrect.");
    }
    console.log("STEP 5 Validation: PASSED! ✅");

    // --- STEP 6: Edit Session (Change student1 to present) ---
    console.log("\n--- STEP 6: Editing Session (Marking student1 present) ---");
    // Incoming diff: student1 present
    const editRecords = [
      { studentId: student1.id, status: "present" },
    ];

    // Load existing
    const [sessionEdit] = await db
      .select({ id: attendanceSessionLedger.id, absentStudentIds: attendanceSessionLedger.absentStudentIds })
      .from(attendanceSessionLedger)
      .where(eq(attendanceSessionLedger.id, sessionId));

    const editAbsentSet = new Set(sessionEdit.absentStudentIds);
    for (const r of editRecords) {
      if (r.status === "absent") {
        editAbsentSet.add(r.studentId);
      } else {
        editAbsentSet.delete(r.studentId);
      }
    }
    const finalEditAbsentIds = Array.from(editAbsentSet);
    console.log("Calculated final edit absent IDs:", finalEditAbsentIds); // should be empty []

    // Save (edit trigger)
    await submitAttendanceCQRS({
      semesterId: semester.id,
      divisionId: division.id,
      facultyId: facultyMember.id,
      date: "2026-05-19",
      startTime: "08:40:00",
      endTime: "09:20:00",
      subjectName: "CQRS Distributed Architectures",
      absentStudentIds: finalEditAbsentIds,
    });

    // Check stats again
    const s1StatsPostEdit = await getDashboardStats(student1.id);
    const s2StatsPostEdit = await getDashboardStats(student2.id);

    console.log(`Student 1 post-edit stats: present=${s1StatsPostEdit?.presentCount}, total=${s1StatsPostEdit?.totalLectures}, pct=${s1StatsPostEdit?.attendancePercentage}%`);
    console.log(`Student 2 post-edit stats: present=${s2StatsPostEdit?.presentCount}, total=${s2StatsPostEdit?.totalLectures}, pct=${s2StatsPostEdit?.attendancePercentage}%`);

    // Both should be present=1, total=1, percentage=100.00%
    if (s1StatsPostEdit?.presentCount !== 1 || s1StatsPostEdit?.totalLectures !== 1 || Number(s1StatsPostEdit?.attendancePercentage) !== 100) {
      throw new Error("Student 1 stats post-edit incorrect.");
    }
    if (s2StatsPostEdit?.presentCount !== 1 || s2StatsPostEdit?.totalLectures !== 1 || Number(s2StatsPostEdit?.attendancePercentage) !== 100) {
      throw new Error("Student 2 stats post-edit incorrect.");
    }
    console.log("STEP 6 Validation (No total increment / correct counts): PASSED! ✅");

    console.log("\n=== ALL END-TO-END CQRS INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (error) {
    console.error("Test failed with error:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();
