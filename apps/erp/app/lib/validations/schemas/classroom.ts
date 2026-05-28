import { z } from "zod";
import { NonEmptyString } from "./common";

// ─── POST /api/classes ────────────────────────────────────────────────────────

export const CreateClassroomSchema = z.object({
  roomCode: NonEmptyString,
  buildingName: z.string().trim().optional().or(z.null()),
  floor: NonEmptyString,
  lectureCapacity: z.coerce.number().int().positive(),
  description: z.string().trim().optional().or(z.null()),
});

export type CreateClassroomInput = z.infer<typeof CreateClassroomSchema>;
