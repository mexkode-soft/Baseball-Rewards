"use client";

import Link from "next/link";
import { Bell, BellRing, CheckCheck, ExternalLink, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markAllNotificationsRead, markNotificationRead, readNotifications, subscribeToPush, type UserNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import styles from "./NotificationBell.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function NotificationBell() {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushMessage, setPushMessage] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try { setItems(await readNotifications()); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    void (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(Boolean(subscription) && Notification.permission === "granted");
      } catch { setPushEnabled(false); }
    })();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      channel = supabase.channel(`notifications-${data.user.id}`).on("postgres_changes", {
        event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}`,
      }, () => { void refresh(); }).subscribe();
    });

    const close = (event: PointerEvent) => {
      if (!selected && !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh, selected]);

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  async function readOne(item: UserNotification) {
    if (item.read_at) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: now } : entry));
    try { await markNotificationRead(item.id); } catch { await refresh(); }
  }

  async function openNotification(item: UserNotification) {
    await readOne(item);
    setSelected({ ...item, read_at: item.read_at ?? new Date().toISOString() });
    setOpen(false);
  }

  async function readAll() {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    try { await markAllNotificationsRead(); } catch { await refresh(); }
  }

  async function enablePush() {
    setPushMessage("Activando...");
    try {
      const result = await subscribeToPush();
      if (result === "subscribed") setPushEnabled(true);
      setPushMessage(result === "subscribed" ? "Notificaciones push activadas." : result === "denied" ? "Permiso rechazado desde el dispositivo." : result === "missing-key" ? "Falta configurar la llave pública VAPID." : "Este navegador no admite notificaciones push.");
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "No se pudo activar push."); }
  }

  return <div className={styles.root} ref={rootRef}>
    <button type="button" className={styles.bellButton} onClick={() => setOpen((value) => { const next = !value; if (next) void refresh(); return next; })} aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}>
      {unread ? <BellRing /> : <Bell />}{unread > 0 ? <span>{unread > 99 ? "99+" : unread}</span> : null}
    </button>

    {open ? <section className={styles.panel} aria-label="Bandeja de notificaciones">
      <header><div><strong>Notificaciones</strong><small>{unread ? `${unread} sin leer` : "Todo al día"}</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X /></button></header>
      <div className={styles.actions}><button type="button" onClick={readAll} disabled={!unread}><CheckCheck /> Marcar todas</button>{!pushEnabled ? <button type="button" onClick={enablePush}><BellRing /> Activar push</button> : null}</div>
      {pushMessage ? <p className={styles.pushMessage}>{pushMessage}</p> : null}
      <div className={styles.list}>
        {loading ? <div className={styles.empty}><LoaderCircle className={styles.spinner} /> Cargando...</div> : items.length === 0 ? <div className={styles.empty}>Todavía no tienes notificaciones.</div> : items.map((item) => (
          <button type="button" key={item.id} className={`${styles.item} ${!item.read_at ? styles.unread : ""}`} onClick={() => void openNotification(item)}>
            <div className={styles.itemTop}><strong>{item.title}</strong>{!item.read_at ? <i /> : null}</div><p>{item.body}</p><time>{formatDate(item.created_at)}</time>
          </button>
        ))}
      </div>
    </section> : null}

    {selected ? <div className={styles.notificationOverlay} role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelected(null)}>
      <article className={styles.notificationCard} onClick={(event) => event.stopPropagation()}>
        <div className={styles.notificationCardHeader}>
          <div><span>HOME RUN REWARDS</span><h2>{selected.title}</h2></div>
          <button type="button" onClick={() => setSelected(null)} aria-label="Cerrar notificación"><X /></button>
        </div>
        <p>{selected.body}</p>
        {selected.image_url ? <img src={selected.image_url} alt="" className={styles.notificationImage} /> : null}
        <time>{formatDate(selected.created_at)}</time>
        <div className={styles.notificationCardActions}>
          <button type="button" onClick={() => setSelected(null)}>Cerrar</button>
          {selected.action_url ? <Link href={selected.action_url} onClick={() => setSelected(null)}>Ver detalle <ExternalLink /></Link> : null}
        </div>
      </article>
    </div> : null}
  </div>;
}
