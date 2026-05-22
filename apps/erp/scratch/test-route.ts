import { NextRequest } from "next/server";
import { POST } from "../app/api/notifications/route";

async function test() {
  const req = new NextRequest("http://localhost/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Active-Role": "admin",
    },
    body: JSON.stringify({
      title: "Test Title",
      message: "Test Message",
      notificationType: "fee_event",
      receiverUserId: 1,
      receiverRole: "student",
      priority: "medium",
    }),
  });

  const res = await POST(req);
  console.log("Status:", res.status);
  console.log("Body:", await res.json());
}

test().catch(console.error);
