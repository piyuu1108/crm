const fetch = require("node-fetch"); // Wait, Node 18+ has fetch natively

async function run() {
  const payload = {
    academicTermId: "TERM-2026-EVEN",
    publishId: "pub_12345",
    entries: [
      {
        dayOfWeek: "Monday",
        startTime: "09:00",
        endTime: "10:00",
        facultyCode: "KB",
        subjectCode: "301",
        classCode: "26BCAAI1",
        roomCode: "ROOM-1",
        isLab: false,
      }
    ]
  };

  const res = await fetch("http://localhost:3000/api/integration/timetable/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer dev-ims-secret"
    },
    body: JSON.stringify(payload)
  });

  console.log("Status:", res.status);
  const json = await res.json();
  console.log("Response:", JSON.stringify(json, null, 2));
}

run();
