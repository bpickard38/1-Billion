"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NotificationKind } from "@/lib/notifications";
import type { Json } from "@/lib/supabase/types";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribePush(subscription: PushSubscriptionInput, userAgent: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function unsubscribePush(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

export async function getNotificationPrefs(): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("notification_prefs").maybeSingle();
  return (data?.notification_prefs as Record<string, boolean> | null) ?? {};
}

// profiles.notification_prefs defaults every kind to enabled unless explicitly
// set false (lib/notifications.ts#isNotificationEnabled) — this only ever
// writes the one key that changed, never the whole set.
export async function setNotificationPref(kind: NotificationKind, enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase.from("profiles").select("notification_prefs").maybeSingle();
  const prefs = (profile?.notification_prefs as Record<string, boolean> | null) ?? {};
  const next = { ...prefs, [kind]: enabled };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: next as unknown as Json })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  refresh();
}
