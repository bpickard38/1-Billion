"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actionResult, databaseError, planningContext } from "@/lib/planning-server";
import { encryptToken, decryptToken } from "@/lib/canvas-secret";
import { readAssignments, readCourses } from "@/lib/canvas-client";

export async function getCanvasSettings() {
  return actionResult(async () => {
    const { db, user } = await planningContext();
    const { data, error } = await db.from("canvas_connections").select("courses, selected_course_ids, last_synced_at").eq("user_id",user.id).maybeSingle();
    databaseError(error);
    return { connected: Boolean(data), courses: z.array(z.object({ id: z.string(), name: z.string() })).parse(data?.courses ?? []), selected: data?.selected_course_ids ?? [], lastSyncedAt: data?.last_synced_at ?? null };
  });
}

export async function connectCanvas(rawToken: string) {
  return actionResult(async () => {
    const { db, user } = await planningContext();
    const token = z.string().trim().min(10).max(4096).regex(/^\S+$/).parse(rawToken);
    const encrypted = encryptToken(token, user.id);
    const courses = await readCourses(token);
    const { data: previous, error: readError } = await db.from("canvas_connections").select("selected_course_ids").eq("user_id",user.id).maybeSingle();
    databaseError(readError);
    const selected = previous ? previous.selected_course_ids.filter(id => courses.some(c => c.id === id)) : courses.map(c => c.id);
    const { error } = await db.from("canvas_connections").upsert({ user_id: user.id, token_ciphertext: encrypted, courses, selected_course_ids: selected });
    databaseError(error);
    revalidatePath("/more/canvas");
    return { courses, selected };
  });
}

export async function refreshCanvas(selectedIds?: string[]) {
  return actionResult(async () => {
    const { db, user } = await planningContext();
    const { data: connection, error } = await db.from("canvas_connections").select("*").eq("user_id",user.id).maybeSingle();
    databaseError(error);
    if (!connection) throw new Error("Connect Canvas in Settings first.");
    const token = decryptToken(connection.token_ciphertext, user.id);
    const courses = await readCourses(token);
    const selected = z.array(z.string().regex(/^\d+$/)).max(30).parse(selectedIds ?? connection.selected_course_ids);
    if (selected.some(id => !courses.some(c => c.id === id))) throw new Error("Your courses changed. Reconnect Canvas to update the course list.");
    const assignments = await readAssignments(token, courses.filter(c => selected.includes(c.id)));
    // Fetch everything successfully before changing the stored snapshot.
    const { data: existing, error: existingError } = await db.from("canvas_assignments").select("id, course_id, external_id").eq("user_id",user.id);
    databaseError(existingError);
    if (assignments.length) {
      const { error: saveError } = await db.from("canvas_assignments").upsert(assignments.map(a => ({ ...a, user_id: user.id, active: true })), { onConflict: "user_id,course_id,external_id" });
      databaseError(saveError);
    }
    const keys = new Set(assignments.map(a => `${a.course_id}:${a.external_id}`));
    const stale = (existing ?? []).filter(a => !keys.has(`${a.course_id}:${a.external_id}`)).map(a => a.id);
    if (stale.length) databaseError((await db.from("canvas_assignments").update({ active: false }).in("id",stale).eq("user_id",user.id)).error);
    databaseError((await db.from("canvas_connections").update({ courses, selected_course_ids: selected, last_synced_at: new Date().toISOString() }).eq("user_id",user.id)).error);
    revalidatePath("/schedule/plan");
    revalidatePath("/more/canvas");
    return { count: assignments.length };
  });
}

export async function disconnectCanvas() {
  return actionResult(async () => {
    const { db, user } = await planningContext();
    databaseError((await db.from("canvas_connections").delete().eq("user_id",user.id)).error);
    databaseError((await db.from("canvas_assignments").delete().eq("user_id",user.id)).error);
    revalidatePath("/more/canvas");
    revalidatePath("/schedule/plan");
    return true;
  });
}
