import { test } from "node:test";
import assert from "node:assert/strict";
import {
  kindsScheduledAtHour,
  notificationContent,
  isNotificationEnabled,
} from "./notifications.ts";

test("kindsScheduledAtHour: today_priority fires at hour 7 only", () => {
  assert.deepEqual(kindsScheduledAtHour(3, 7), ["today_priority"]);
  assert.deepEqual(kindsScheduledAtHour(3, 6), []);
  assert.deepEqual(kindsScheduledAtHour(3, 8), []);
});

test("kindsScheduledAtHour: uncomfortable_rep only fires at 4 PM on weekdays (1-5)", () => {
  assert.deepEqual(kindsScheduledAtHour(1, 16), ["uncomfortable_rep"]);
  assert.deepEqual(kindsScheduledAtHour(5, 16), ["uncomfortable_rep"]);
  assert.deepEqual(kindsScheduledAtHour(6, 16), []);
  assert.deepEqual(kindsScheduledAtHour(7, 16), []);
});

test("kindsScheduledAtHour: weekly_review only fires Friday at 5 PM", () => {
  assert.deepEqual(kindsScheduledAtHour(5, 17), ["weekly_review"]);
  assert.deepEqual(kindsScheduledAtHour(4, 17), []);
  assert.deepEqual(kindsScheduledAtHour(6, 17), []);
});

test("kindsScheduledAtHour: daily_review fires at hour 21 every day", () => {
  for (let weekday = 1; weekday <= 7; weekday++) {
    assert.deepEqual(kindsScheduledAtHour(weekday, 21), ["daily_review"]);
  }
});

test("kindsScheduledAtHour: an hour with nothing scheduled returns an empty list", () => {
  assert.deepEqual(kindsScheduledAtHour(3, 12), []);
});

test("notificationContent routes weekly_review to /week/review and everything else to a sensible page", () => {
  assert.equal(notificationContent("weekly_review").url, "/week/review");
  assert.equal(notificationContent("today_priority").url, "/today");
});

test("isNotificationEnabled defaults to true when prefs are missing or the key is absent", () => {
  assert.equal(isNotificationEnabled(null, "daily_review"), true);
  assert.equal(isNotificationEnabled({}, "daily_review"), true);
  assert.equal(isNotificationEnabled({ daily_review: false }, "daily_review"), false);
  assert.equal(isNotificationEnabled({ daily_review: true }, "daily_review"), true);
});
