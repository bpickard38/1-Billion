import test from "node:test";
import assert from "node:assert/strict";
import { canvasPages, canvasUrl } from "./canvas-client.ts";

test("Canvas host allowlist rejects credential leaks and non-API paths", () => {
  for (const path of ["https://evil.example/api/v1/courses","http://byu.instructure.com/api/v1/courses","https://byu.instructure.com.evil.example/api/v1/courses","/login","https://user@byu.instructure.com/api/v1/courses"]) assert.throws(() => canvasUrl(path));
});
test("follows pagination with GET only and never follows cross-host links", async () => {
  const calls: RequestInit[] = [];
  const fetcher: typeof fetch = async (_url,init) => {
    calls.push(init!);
    return new Response(JSON.stringify([{id:calls.length}]),{headers:calls.length === 1 ? {link:'<https://byu.instructure.com/api/v1/courses?page=2>; rel="next"'} : {}});
  };
  assert.deepEqual(await canvasPages("/api/v1/courses","private-test-value",fetcher),[{id:1},{id:2}]);
  assert.ok(calls.every(c => c.method === "GET" && c.redirect === "error" && c.cache === "no-store"));
  let count = 0;
  await assert.rejects(canvasPages("/api/v1/courses","private-test-value",async () => { count++; return new Response("[]",{headers:{link:'<https://evil.example/api/v1/courses>; rel="next"'}}); }),/invalid page/);
  assert.equal(count,1);
});
test("expired credentials produce a safe actionable error", async () => {
  await assert.rejects(canvasPages("/api/v1/courses","private-test-value",async () => new Response("secret body",{status:401})),/Replace your token/);
});
