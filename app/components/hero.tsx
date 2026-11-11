"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Icon, { type IconName } from "./store-icon";

const slides: {
  label: string;
  firstLine: string;
  emphasis: string;
  ending: string;
  description: string;
  action: string;
  category: string;
  image: string;
  imagePosition: string;
  icon: IconName;
  detail: string;
  detailLabel: string;
}[] = [
  {
    label: "THE GOOD SOUND EDIT",
    firstLine: "Sounds like",
    emphasis: "your kind",
    ending: "of day.",
    description: "For the playlists, podcasts, and little moments in between. Find your sound, and make it yours.",
    action: "Explore sound",
    category: "Headphones",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=2000&q=85",
    imagePosition: "center 48%",
    icon: "headphones",
    detail: "A little more",
    detailLabel: "MUSIC IN YOUR DAY",
  },
  {
    label: "THE HOME SOUND EDIT",
    firstLine: "Make room",
    emphasis: "for good",
    ending: "sound.",
    description: "From slow mornings to spontaneous dancing. Bring the soundtrack home.",
    action: "Explore speakers",
    category: "Speakers",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=2000&q=85",
    imagePosition: "center 50%",
    icon: "speaker",
    detail: "Turn up",
    detailLabel: "THE EVERYDAY",
  },
  {
    label: "THE LITTLE MOMENTS EDIT",
    firstLine: "Keep the",
    emphasis: "little things",
    ending: "close.",
    description: "The big adventures and the in-between moments. Find a new way to remember them.",
    action: "Explore cameras",
    category: "Cameras",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=2000&q=85",
    imagePosition: "center 48%",
    icon: "camera",
    detail: "Made for",
    detailLabel: "MOMENTS THAT MATTER",
  },
];

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function getReducedMotion() { return window.matchMedia(motionQuery).matches; }
function getServerReducedMotion() { return true; }

export default function Hero({ onSelectCategory }: { onSelectCategory: (category: string) => void }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerReducedMotion);
  const rotating = playing && !reducedMotion && !hovering && !focused;
  const slide = slides[active];

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [rotating, active]);

  function move(direction: number) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  return <section
    className="hero shell"
    aria-label="Featured collections"
    aria-roledescription="carousel"
    onMouseEnter={() => setHovering(true)}
    onMouseLeave={() => setHovering(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}
  >
    {slides.map((item, index) => <div key={item.label} className={`hero-image ${index === active ? "is-active" : ""}`} style={{ backgroundImage: `url("${item.image}")`, backgroundPosition: item.imagePosition }} aria-hidden="true" />)}
    <div className="hero-shade" />
    <div className="hero-copy" key={slide.label} aria-live={rotating ? "off" : "polite"} aria-atomic="true">
      <div className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> {slide.label} <span className="hero-number">{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span></div>
      <h1>{slide.firstLine}<br /><em>{slide.emphasis}</em> {slide.ending}</h1>
      <p>{slide.description}</p>
      <button className="button button-light" onClick={() => onSelectCategory(slide.category)}>{slide.action} <Icon name="arrow" size={18} /></button>
    </div>
    <div className="hero-side" aria-hidden="true"><span>THE EVERYDAY, MADE BETTER</span><span className="hero-side-line" /><span>EST. 2024</span></div>
    <div className="hero-feature" aria-hidden="true"><div className="hero-feature-icon"><Icon name={slide.icon} size={24} /></div><div><span>THE GOODFORM EDIT</span><strong>{slide.detail}</strong><small>{slide.detailLabel}</small></div><span className="hero-feature-arrow">↗</span></div>
    <div className="hero-bottom">
      <span className="hero-bottom-label">CURATED FOR REAL LIFE</span>
      <div className="hero-controls">
        <button className="hero-arrow hero-arrow-prev" aria-label="Previous featured collection" onClick={() => move(-1)}><Icon name="arrow" size={16} /></button>
        <div className="hero-dots" aria-label="Choose a featured collection">{slides.map((item, index) => <button key={item.label} className={`hero-dot ${index === active ? "is-active" : ""}`} aria-label={`Show ${item.label.toLowerCase()}`} aria-current={index === active ? "true" : undefined} onClick={() => setActive(index)}><span /></button>)}</div>
        <button className="hero-arrow" aria-label="Next featured collection" onClick={() => move(1)}><Icon name="arrow" size={16} /></button>
        {!reducedMotion && <button className="hero-play" aria-label={playing ? "Pause slideshow" : "Play slideshow"} onClick={() => setPlaying((current) => !current)}><Icon name={playing ? "pause" : "play"} size={14} /></button>}
      </div>
      <span className="hero-bottom-label">SCROLL TO EXPLORE ↓</span>
    </div>
    <div className={`hero-progress ${rotating ? "" : "is-paused"}`} aria-hidden="true"><span key={`${active}-${rotating}`} /></div>
  </section>;
}
