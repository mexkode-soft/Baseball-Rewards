import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
    if (!url || !serviceKey || !vapidPublic || !vapidPrivate) throw new Error("Faltan secretos de configuración push.");

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const body = await request.json().catch(() => ({}));
    const requestedJobId = body?.jobId as string | undefined;

    let jobQuery = supabase.from("push_jobs").select("id,broadcast_id,processed_count,batch_size,status").in("status", ["pending", "processing"]).order("created_at", { ascending: true }).limit(1);
    if (requestedJobId) jobQuery = jobQuery.eq("id", requestedJobId);
    const { data: jobs, error: jobError } = await jobQuery;
    if (jobError) throw jobError;
    const job = jobs?.[0];
    if (!job) return Response.json({ ok: true, message: "Sin trabajos pendientes." }, { headers: corsHeaders });

    await supabase.from("push_jobs").update({ status: "processing", locked_at: new Date().toISOString(), attempts: 1 }).eq("id", job.id);
    const from = Number(job.processed_count || 0);
    const to = from + Number(job.batch_size || 250) - 1;
    const { data: notifications, error: notificationError } = await supabase
      .from("notifications")
      .select("id,user_id,title,body,type,action_url,image_url,created_at")
      .eq("broadcast_id", job.broadcast_id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    if (notificationError) throw notificationError;

    if (!notifications?.length) {
      await supabase.from("push_jobs").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", job.id);
      return Response.json({ ok: true, completed: true }, { headers: corsHeaders });
    }

    const userIds = [...new Set(notifications.map((item) => item.user_id))];
    const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", userIds).eq("is_active", true);
    if (subscriptionError) throw subscriptionError;
    const byUser = new Map<string, typeof subscriptions>();
    for (const subscription of subscriptions ?? []) byUser.set(subscription.user_id, [...(byUser.get(subscription.user_id) ?? []), subscription]);

    let delivered = 0;
    let failed = 0;
    for (const notification of notifications) {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: "/icon-192.png",
        badge: "/badge-96.png",
        image: notification.image_url || undefined,
        url: notification.action_url || "/usuario",
        notificationId: notification.id,
        tag: `hrr-${notification.id}`,
      });
      for (const subscription of byUser.get(notification.user_id) ?? []) {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, { TTL: 86400, urgency: "normal" });
          delivered += 1;
          await supabase.from("push_subscriptions").update({ last_success_at: new Date().toISOString(), last_error: null }).eq("id", subscription.id);
        } catch (error) {
          failed += 1;
          const statusCode = Number((error as { statusCode?: number }).statusCode || 0);
          await supabase.from("push_subscriptions").update({ is_active: ![404, 410].includes(statusCode), last_error: error instanceof Error ? error.message.slice(0, 500) : "Error push" }).eq("id", subscription.id);
        }
      }
    }

    const nextProcessed = from + notifications.length;
    const completed = notifications.length < Number(job.batch_size || 250);
    await supabase.from("push_jobs").update({
      processed_count: nextProcessed,
      delivered_count: delivered,
      failed_count: failed,
      status: completed ? "completed" : "pending",
      completed_at: completed ? new Date().toISOString() : null,
      locked_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", job.id);

    return Response.json({ ok: true, jobId: job.id, processed: notifications.length, delivered, failed, completed }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Error inesperado" }, { status: 500, headers: corsHeaders });
  }
});
