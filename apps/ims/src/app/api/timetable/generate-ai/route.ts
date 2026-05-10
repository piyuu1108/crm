import { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getGenerationData } from "@/lib/services/generation.service";
import { safeParseInt } from "@/lib/api-utils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── The master prompt for Gemini ──
const SYSTEM_PROMPT = `You are a fast timetable generator. Generate a weekly timetable for ALL classes from the provided payload.

RULES:
- No faculty double-booking (same faculty cannot teach 2 classes at same slot)(Must Maintain)
- No lab room double-booking
- No internal gaps (lectures must be contiguous per class per day, empty slots only at edges)
- Labs spanning multiple slots must be consecutive within break groups (Group A: slots 1-2, Group B: slots 3-5)
- Each class has max 5 slots per day across 6 days (Mon-Sat)
- Use assignment data: each assignment has theoryPerWeek and labCount/labDurationSlots
- Lab entries need a roomId from assignedLabIds

DO NOT overthink.
Do NOT remove lectures

IMPORTANT DISTRIBUTION RULES:
- SPREAD lectures evenly across ALL 6 days including Saturday. Do NOT leave Saturday empty.
- Every class MUST have at least 2-3 lectures on Saturday.
- Prefer using only 4 slots (slots 1-4) on weekdays and move remaining lectures to Saturday.
- Avoid filling slot 5 on weekdays if Saturday still has free slots.
- Goal: 3-4 lectures per day across 6 days is better than 5 lectures per day across 5 days.

Soft optimizations (nice to have): balanced workload, compact schedules, no repeated subjects same day.

OUTPUT: Return ONLY valid JSON (no markdown, no explanation). Structure:
{
  "status": "success",
  "score": 85,
  "metadata": { "generatedAt": "ISO", "totalClasses": 0, "totalLecturesScheduled": 0, "totalLabsScheduled": 0, "hardConstraintViolations": 0 },
  "statistics": { "scheduled": 0, "unscheduled": 0 },
  "conflicts": [],
  "warnings": [],
  "timetable": {
    "CLASS_ID_NUMBER": {
      "Monday": [ { "slot": 1, "subjectId": 10, "facultyId": 5, "roomId": null, "type": "THEORY" } ],
      "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": []
    }
  }
}

Use numeric IDs only. type is "THEORY" or "LAB". roomId is null for theory, a lab room ID for labs.`;

/**
 * POST /api/timetable/generate-ai
 * Body: { courseId: number }
 *
 * Fetches generation payload, sends to Gemini, returns parsed result + payload for client mapping.
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const body = await request.json();
  const courseId = safeParseInt(body.courseId?.toString());

  if (courseId === null) {
    return Response.json({ error: "courseId is required" }, { status: 400 });
  }

  try {
    // Step 1: Get generation payload from DB
    const payload = await getGenerationData(courseId);

    const userMessage = `Here is the generation payload with all classes, subjects, faculties, rooms, and assignments:

${JSON.stringify(payload, null, 0)}

Generate timetable for ALL ${payload.classes?.length || 0} classes. Return ONLY JSON.`;

    const geminiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 65536,
          responseMimeType: "application/json",
          // thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", errText);
      return Response.json(
        { error: `Gemini API error: ${geminiResponse.status}`, details: errText },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();

    // Extract text from Gemini response
    const textContent =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON from Gemini's response
    let aiResult: any;
    try {
      // Clean potential markdown wrapping
      let cleaned = textContent.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      aiResult = JSON.parse(cleaned.trim());
    } catch (parseErr) {
      console.error("Failed to parse Gemini output:", textContent.slice(0, 500));
      return Response.json(
        { error: "Failed to parse Gemini response as JSON", raw: textContent.slice(0, 2000) },
        { status: 502 }
      );
    }

    // Step 4: Return AI result + payload metadata for client-side mapping
    return Response.json({
      aiResult,
      payload: {
        metadata: payload.metadata,
        classes: payload.classes,
        subjects: payload.subjects,
        faculties: payload.faculties,
        rooms: payload.rooms,
        assignments: payload.assignments,
        labSessions: payload.labSessions,
      },
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
