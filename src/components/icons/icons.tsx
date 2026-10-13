import type { ReactNode } from "react";

/*
 * The CheckInn icon set (DESIGN.md Components, Icons): simple 20px line icons
 * on a 24-unit grid, 1.5 stroke, round caps, drawn in currentColor. Inline SVG
 * only, so no icon library and no network request.
 */
const paths = {
  "location-pin": (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  heart: (
    <path d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 6.8a4.5 4.5 0 0 1 8 2.7C20 15.2 12 20 12 20Z" />
  ),
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  warning: (
    <>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.5v.01" />
    </>
  ),
  bed: (
    <>
      <path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6" />
      <circle cx="7" cy="11" r="1.75" />
    </>
  ),
  shower: (
    <>
      <path d="M5 21V6a3 3 0 0 1 6 0v1" />
      <path d="M8 10a4 4 0 0 1 8 0H8Z" />
      <path d="M10 14v1M12 14v2M14 14v1M11 18v1M13 18v1" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 19.5v.01" />
    </>
  ),
  pool: (
    <>
      <path d="M8 16V5a2 2 0 0 1 4 0M16 16V5a2 2 0 0 0-2-2" />
      <path d="M8 8h8M8 12h8" />
      <path d="M3 19c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" />
    </>
  ),
  spa: (
    <>
      <path d="M12 20c-4.5 0-8-3-8-7 3 0 6 1.5 8 4 2-2.5 5-4 8-4 0 4-3.5 7-8 7Z" />
      <path d="M12 17c-2-2.5-2-7 0-11 2 4 2 8.5 0 11Z" />
    </>
  ),
  restaurant: (
    <>
      <path d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18" />
      <path d="M17 21V3c-2 1.5-3 4-3 7v3h3" />
    </>
  ),
  parking: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5" />
    </>
  ),
  gym: (
    <>
      <path d="M8 12h8" />
      <rect x="5" y="7" width="3" height="10" rx="1" />
      <rect x="16" y="7" width="3" height="10" rx="1" />
      <path d="M2.5 10v4M21.5 10v4" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" />
    </>
  ),
  "meeting-room": (
    <>
      <rect x="6" y="9" width="12" height="6" rx="1" />
      <path d="M8 15v4M16 15v4" />
      <circle cx="12" cy="5" r="1.75" />
      <path d="M3.5 11v4M20.5 11v4" />
    </>
  ),
  kitchenette: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
      <path d="M4 9h16" />
      <circle cx="8" cy="6.25" r=".75" />
      <circle cx="12" cy="6.25" r=".75" />
      <rect x="7.5" y="12" width="9" height="5.5" rx="1" />
    </>
  ),
  "play-area": (
    <>
      <path d="M4 21 8.5 4h7L20 21" />
      <path d="M8.5 4v9M15.5 4v9M9 13h6" />
      <path d="M10 13v3.5a2 2 0 0 0 4 0V13" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 5.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export const iconNames = Object.keys(paths) as IconName[];

type IconProps = {
  name: IconName;
  /** Accessible name. Leave it out when the icon sits beside text. */
  title?: string;
  className?: string;
};

export function Icon({ name, title, className }: IconProps) {
  const a11y = title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": true as const };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={className}
      {...a11y}
    >
      {paths[name]}
    </svg>
  );
}
