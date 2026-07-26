export type AnnouncementIcon =
  | "ticket"
  | "gift"
  | "trophy"
  | "star";

export interface Announcement {
  id: string;
  text: string;
  icon: AnnouncementIcon;
  active: boolean;
  order: number;
}

export const ANNOUNCEMENTS_STORAGE_KEY =
  "hrr-announcements";

export const ANNOUNCEMENTS_UPDATED_EVENT =
  "hrr-announcements-updated";

export const DEFAULT_ANNOUNCEMENTS:
  Announcement[] = [
    {
      id: "announcement-1",
      text:
        "2x1 en el partido Águilas vs. Tomateros",
      icon: "ticket",
      active: true,
      order: 1,
    },
    {
      id: "announcement-2",
      text:
        "Premios sorpresa durante el encuentro",
      icon: "gift",
      active: true,
      order: 2,
    },
    {
      id: "announcement-3",
      text:
        "Participa y sube en el ranking",
      icon: "trophy",
      active: true,
      order: 3,
    },
    {
      id: "announcement-4",
      text:
        "Encuentra recompensas cerca del estadio",
      icon: "star",
      active: true,
      order: 4,
    },
  ];

function normalizeAnnouncements(
  announcements: Announcement[]
) {
  return announcements
    .map(
      (
        announcement,
        index
      ) => ({
        ...announcement,
        order:
          Number.isFinite(
            announcement.order
          )
            ? announcement.order
            : index + 1,
      })
    )
    .sort(
      (first, second) =>
        first.order -
        second.order
    )
    .map(
      (
        announcement,
        index
      ) => ({
        ...announcement,
        order: index + 1,
      })
    );
}

export function readAnnouncements() {
  if (
    typeof window ===
    "undefined"
  ) {
    return DEFAULT_ANNOUNCEMENTS;
  }

  const stored =
    window.localStorage.getItem(
      ANNOUNCEMENTS_STORAGE_KEY
    );

  if (!stored) {
    return DEFAULT_ANNOUNCEMENTS;
  }

  try {
    const parsed =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return DEFAULT_ANNOUNCEMENTS;
    }

    return normalizeAnnouncements(
      parsed as Announcement[]
    );
  } catch {
    return DEFAULT_ANNOUNCEMENTS;
  }
}

export function saveAnnouncements(
  announcements: Announcement[]
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const normalized =
    normalizeAnnouncements(
      announcements
    );

  window.localStorage.setItem(
    ANNOUNCEMENTS_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  window.dispatchEvent(
    new CustomEvent(
      ANNOUNCEMENTS_UPDATED_EVENT
    )
  );
}
