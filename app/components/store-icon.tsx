import type { ReactNode } from "react";

export type IconName = "search" | "bag" | "heart" | "arrow" | "arrowUp" | "headphones" | "speaker" | "camera" | "watch" | "gaming" | "grid" | "close" | "plus" | "minus" | "pin" | "box" | "spark" | "pause" | "play";

const paths: Record<IconName, ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></>,
  bag: <><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  heart: <path d="M20.5 9c0 4.5-8.5 10-8.5 10S3.5 13.5 3.5 9a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z" />,
  arrow: <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
  arrowUp: <><path d="M5 19 19 5" /><path d="M7 5h12v12" /></>,
  headphones: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="12" width="4" height="7" rx="2" /><rect x="17" y="12" width="4" height="7" rx="2" /></>,
  speaker: <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="14" r="3" /><circle cx="12" cy="7" r="1" /></>,
  camera: <><path d="M4 8h4l2-3h4l2 3h4v11H4V8Z" /><circle cx="12" cy="13" r="3" /></>,
  watch: <><rect x="7" y="6" width="10" height="12" rx="3" /><path d="m9 6 1-4h4l1 4M9 18l1 4h4l1-4" /></>,
  gaming: <><path d="M7 8h10c2 0 3 2 4 7s-2 5-4 3l-2-2H9l-2 2c-2 2-5 2-4-3s2-7 4-7Z" /><path d="M7 12h4m-2-2v4m7-2h.01m2 2h.01" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  box: <><path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z" /><path d="m3 7 9 4 9-4M12 11v10" /></>,
  spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  pause: <><path d="M9 5v14M15 5v14" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
};

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
