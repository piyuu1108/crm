const { execSync } = require('child_process');

const files = [
  "app/api/requests/[id]/route.ts",
  "app/api/requests/route.ts",
  "app/api/requests/faculty-search/route.ts",
  "app/api/requests/faculty/route.ts",
  "app/api/internal-exams/[id]/route.ts",
  "app/api/internal-exams/student-marks/route.ts",
  "app/api/internal-exams/route.ts",
  "app/api/internal-evaluation/export/route.ts",
  "app/api/faculty/circulars/[slug]/route.ts",
  "app/api/faculty/circulars/route.ts",
  "app/api/counselor/students/[studentId]/route.ts",
  "app/api/counselor/students/next-id/route.ts",
  "app/api/counselor/email-jobs/[jobId]/route.ts",
  "app/api/counselor/divisions/[id]/students/send-password-email/route.ts",
  "app/api/counselor/divisions/[id]/students/send-password-email/bulk/route.ts",
  "app/api/counselor/divisions/[id]/students/route.ts",
  "app/api/counselor/divisions/[id]/route.ts",
  "app/api/counselor/divisions/route.ts",
  "app/api/circulars/[slug]/route.ts",
  "app/api/circulars/route.ts",
  "app/api/attendance/students/route.ts",
  "app/api/attendance/sessions/route.ts",
  "app/api/admin/promotion/route.ts",
  "app/api/admin/timetable/divisions/route.ts",
  "app/api/admin/timetable/publish/route.ts",
  "app/api/admin/subject-assignments/route.ts",
  "app/api/admin/subjects/route.ts",
  "app/api/admin/subjects/[id]/route.ts",
  "app/api/attendance/my/route.ts",
  "app/api/admin/students/[studentId]/route.ts",
  "app/api/admin/faculty/[id]/route.ts",
  "app/api/admin/faculty/send-password-email/route.ts",
  "app/api/admin/faculty/route.ts",
  "app/api/admin/faculty/send-password-email/bulk/route.ts",
  "app/api/admin/students/next-id/route.ts",
  "app/api/admin/enrollment-history/route.ts",
  "app/api/admin/email-jobs/[jobId]/route.ts",
  "app/api/admin/divisions/route.ts",
  "app/api/admin/divisions/[id]/route.ts",
  "app/api/admin/divisions/[id]/students/send-password-email/route.ts",
  "app/api/admin/divisions/[id]/students/send-password-email/bulk/route.ts"
];

for (const file of files) {
  try {
    execSync(`git checkout -- "${file}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Failed to restore ${file}:`, e.message);
  }
}
