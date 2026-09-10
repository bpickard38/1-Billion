import { z } from "zod";

export const CANVAS_ORIGIN = "https://byu.instructure.com";
const courseSchema = z.object({ id: z.number().int(), name: z.string().optional() });
const assignmentSchema = z.object({
  id: z.number().int(), name: z.string(), description: z.string().nullable().optional(),
  due_at: z.string().nullable(), html_url: z.string(), published: z.boolean().optional(),
  submission: z.object({ workflow_state: z.string().optional(), submitted_at: z.string().nullable().optional(), excused: z.boolean().nullable().optional(), missing: z.boolean().optional() }).nullable().optional(),
});
export type CanvasAssignment = { external_id: string; course_id: string; course_name: string; title: string; description: string; due_at: string | null; url: string; submitted: boolean };

export function canvasUrl(path: string) {
  const url = new URL(path, CANVAS_ORIGIN);
  if (url.origin !== CANVAS_ORIGIN || !url.pathname.startsWith("/api/v1/") || url.username || url.password) throw new Error("Canvas returned an invalid page link.");
  // Never accept a token embedded in a pagination URL.
  url.searchParams.delete("access_token");
  return url;
}

export async function canvasPages(path: string, token: string, fetcher: typeof fetch = fetch): Promise<unknown[]> {
  let url: URL | null = canvasUrl(path);
  const result: unknown[] = [];
  const visited = new Set<string>();
  while (url) {
    if (visited.has(url.href) || visited.size >= 50) throw new Error("Canvas returned too many pages. Try fewer courses.");
    visited.add(url.href);
    const response: Response = await fetcher(url, { method: "GET", headers: { Authorization: `Bearer ${token}` }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Canvas access expired or was denied. Replace your token in Settings." : response.status === 429 ? "Canvas is busy. Wait a minute and refresh again." : "Could not read Canvas. Please try again.");
    const page: unknown = await response.json();
    if (!Array.isArray(page)) throw new Error("Canvas returned an unexpected response.");
    result.push(...page);
    const next: string | undefined = response.headers.get("link")?.split(",").find(part => /rel="next"/.test(part))?.match(/<([^>]+)>/)?.[1];
    url = next ? canvasUrl(next) : null;
  }
  return result;
}

export async function readCourses(token: string) {
  return z.array(courseSchema).parse(await canvasPages("/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100", token)).filter(c => c.name).map(c => ({ id: String(c.id), name: c.name! }));
}

export async function readAssignments(token: string, courses: { id: string; name: string }[]) {
  const output: CanvasAssignment[] = [];
  for (const course of courses) {
    const rows = z.array(assignmentSchema).parse(await canvasPages(`/api/v1/courses/${encodeURIComponent(course.id)}/assignments?include[]=submission&per_page=100`, token));
    for (const row of rows) {
      if (row.published === false) continue;
      const submission = row.submission;
      const url = new URL(row.html_url, CANVAS_ORIGIN);
      output.push({ external_id: String(row.id), course_id: course.id, course_name: course.name, title: row.name.slice(0,250), description: (row.description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g," ").slice(0,6000), due_at: row.due_at, url: url.origin === CANVAS_ORIGIN ? url.href : `${CANVAS_ORIGIN}/courses/${course.id}/assignments/${row.id}`, submitted: Boolean(submission?.excused || (submission?.submitted_at && !submission.missing) || (["submitted", "pending_review", "graded"].includes(submission?.workflow_state ?? "") && !submission?.missing)) });
    }
  }
  return output;
}
