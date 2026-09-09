"use client";

import { useEffect, useState, useTransition } from "react";
import { NOTIFICATION_KINDS, NOTIFICATION_LABEL, isNotificationEnabled } from "@/lib/notifications";
import { subscribePush, unsubscribePush, setNotificationPref } from "@/app/(app)/more/notifications/actions";

// VAPID's applicationServerKey wants a Uint8Array, not the base64url string
// the server hands out — this is the standard web-push conversion.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export default function PushNotificationSettings({
  initialPrefs,
}: {
  initialPrefs: Record<string, boolean>;
}) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null); // null = still checking
  const [prefs, setPrefs] = useState(initialPrefs);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function checkSubscription() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setSubscribed(false);
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(sub));
      } catch {
        if (!cancelled) setSubscribed(false);
      }
    }

    checkSubscription();
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    setStatus(null);
    startTransition(async () => {
      try {
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setStatus("Notifications permission denied.");
            return;
          }
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
        });
        await subscribePush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }, navigator.userAgent);
        setSubscribed(true);
      } catch {
        setStatus("Couldn't enable push on this device.");
      }
    });
  }

  function disable() {
    setStatus(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
      } catch {
        setStatus("Couldn't disable push on this device.");
      }
    });
  }

  function sendTest() {
    setStatus(null);
    startTransition(async () => {
      const res = await fetch("/api/push/test", { method: "POST" });
      const body = await res.json();
      setStatus(res.ok ? `Sent to ${body.sent} device${body.sent === 1 ? "" : "s"}.` : body.error);
    });
  }

  function togglePref(kind: (typeof NOTIFICATION_KINDS)[number]) {
    const next = !isNotificationEnabled(prefs, kind);
    setPrefs((p) => ({ ...p, [kind]: next }));
    startTransition(async () => {
      await setNotificationPref(kind, next);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={subscribed ? disable : enable}
          disabled={isPending || subscribed === null}
          className="rounded-lg border border-border px-3 py-2 text-left text-sm disabled:opacity-50"
        >
          {subscribed === null
            ? "Checking..."
            : subscribed
              ? "Disable push on this device"
              : "Enable on this device"}
        </button>
        {subscribed && (
          <button
            type="button"
            onClick={sendTest}
            disabled={isPending}
            className="rounded-lg border border-border px-3 py-2 text-left text-sm disabled:opacity-50"
          >
            Send test notification
          </button>
        )}
        {status && <p className="text-xs text-muted">{status}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {NOTIFICATION_KINDS.map((kind) => {
          const enabled = isNotificationEnabled(prefs, kind);
          return (
            <label key={kind} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => togglePref(kind)}
                className="h-4 w-4 shrink-0 accent-accent"
              />
              <span className="flex-1">{NOTIFICATION_LABEL[kind]}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
