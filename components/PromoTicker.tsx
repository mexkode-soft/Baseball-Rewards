"use client";

import {
  Gift,
  Star,
  TicketPercent,
  Trophy,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type Announcement,
  ANNOUNCEMENTS_UPDATED_EVENT,
  DEFAULT_ANNOUNCEMENTS,
  readAnnouncements,
} from "@/lib/announcements";

import { supabase } from "@/lib/supabase";

import styles from "./PromoTicker.module.css";

const iconMap = {
  ticket: TicketPercent,
  gift: Gift,
  trophy: Trophy,
  star: Star,
};

interface PromotionGroupProps {
  announcements: Announcement[];
  hidden?: boolean;
  groupId: string;
}

function PromotionGroup({ announcements, hidden = false, groupId }: PromotionGroupProps) {
  return (
    <div
      className={styles.promotionGroup}
      aria-hidden={hidden || undefined}
    >
      {announcements.map(
        (announcement) => {
          const Icon =
            iconMap[
              announcement.icon
            ];

          return (
            <div
              key={`${groupId}-${announcement.id}`}
              className={
                styles.promotionItem
              }
            >
              <Icon />

              <span>
                {
                  announcement.text
                }
              </span>

              <span
                className={
                  styles.separator
                }
                aria-hidden="true"
              >
                ⚾
              </span>
            </div>
          );
        }
      )}
    </div>
  );
}

export default function PromoTicker() {
  const [
    announcements,
    setAnnouncements,
  ] = useState<Announcement[]>(
    DEFAULT_ANNOUNCEMENTS
  );

  useEffect(() => {
    async function refreshAnnouncements() {
      try {
        setAnnouncements(await readAnnouncements());
      } catch (error) {
        console.error("No fue posible actualizar la cinta:", error);
        setAnnouncements([]);
      }
    }

    void refreshAnnouncements();

    const refresh = () => {
      void refreshAnnouncements();
    };

    window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, refresh);

    const channel = supabase
      .channel("public-announcements-ticker")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        refresh
      )
      .subscribe();

    return () => {
      window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, refresh);
      void supabase.removeChannel(channel);
    };
  }, []);

  const activeAnnouncements =
    useMemo(
      () =>
        announcements
          .filter(
            (announcement) =>
              announcement.active
          )
          .sort(
            (first, second) =>
              first.order -
              second.order
          ),
      [announcements]
    );

  const marqueeAnnouncements = useMemo(() => {
    if (activeAnnouncements.length === 0) return [];
    // Repite el contenido dentro de cada bloque para que aun con una sola
    // promoción el ancho siempre supere al viewport y nunca aparezca un hueco.
    const repetitions = Math.max(4, Math.ceil(10 / activeAnnouncements.length));
    return Array.from({ length: repetitions }, (_, repetition) =>
      activeAnnouncements.map((announcement) => ({
        ...announcement,
        id: `${announcement.id}-${repetition}`,
      })),
    ).flat();
  }, [activeAnnouncements]);

  if (marqueeAnnouncements.length === 0) {
    return null;
  }

  return (
    <aside
      className={
        styles.ticker
      }
      aria-label="Promociones activas"
    >
      <div
        className={
          styles.tickerViewport
        }
      >
        <div
          className={
            styles.tickerTrack
          }
        >
          <PromotionGroup
            announcements={marqueeAnnouncements}
            groupId="primary"
          />

          <PromotionGroup
            announcements={marqueeAnnouncements}
            groupId="duplicate"
            hidden
          />
        </div>
      </div>
    </aside>
  );
}
