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
  ANNOUNCEMENTS_STORAGE_KEY,
  ANNOUNCEMENTS_UPDATED_EVENT,
  DEFAULT_ANNOUNCEMENTS,
  readAnnouncements,
} from "@/lib/announcements";

import styles from "./PromoTicker.module.css";

const iconMap = {
  ticket: TicketPercent,
  gift: Gift,
  trophy: Trophy,
  star: Star,
};

interface PromotionGroupProps {
  announcements:
    Announcement[];
}

function PromotionGroup({
  announcements,
}: PromotionGroupProps) {
  return (
    <div
      className={
        styles.promotionGroup
      }
    >
      {announcements.map(
        (announcement) => {
          const Icon =
            iconMap[
              announcement.icon
            ];

          return (
            <div
              key={
                announcement.id
              }
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
    function refreshAnnouncements() {
      setAnnouncements(
        readAnnouncements()
      );
    }

    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key ===
        ANNOUNCEMENTS_STORAGE_KEY
      ) {
        refreshAnnouncements();
      }
    }

    refreshAnnouncements();

    window.addEventListener(
      ANNOUNCEMENTS_UPDATED_EVENT,
      refreshAnnouncements
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        ANNOUNCEMENTS_UPDATED_EVENT,
        refreshAnnouncements
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
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

  if (
    activeAnnouncements.length ===
    0
  ) {
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
            announcements={
              activeAnnouncements
            }
          />

          <div
            aria-hidden="true"
          >
            <PromotionGroup
              announcements={
                activeAnnouncements
              }
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
