import { supabase } from "@/lib/supabase";

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  action_url: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
}

export async function readNotifications(limit = 30): Promise<UserNotification[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,body,type,action_url,image_url,read_at,created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as UserNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return;
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", userData.user.id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function sameApplicationServerKey(subscription: PushSubscription, expected: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const currentBytes = new Uint8Array(current);
  if (currentBytes.length !== expected.length) return false;
  return currentBytes.every((value, index) => value === expected[index]);
}

export async function subscribeToPush(): Promise<"subscribed" | "unsupported" | "denied" | "missing-key"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return "missing-key";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameApplicationServerKey(subscription, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });
  }
  const json = subscription.toJSON();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user || !json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw userError ?? new Error("No se encontró la sesión.");
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userData.user.id,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent,
    device_label: /iPad|iPhone|iPod/.test(navigator.userAgent) ? "iOS PWA" : /Android/.test(navigator.userAgent) ? "Android" : "Web",
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,endpoint" });
  if (error) throw error;
  return "subscribed";
}
