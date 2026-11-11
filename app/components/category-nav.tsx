import Icon, { type IconName } from "./store-icon";

const categories: { name: string; icon: IconName }[] = [
  { name: "All things", icon: "grid" },
  { name: "Headphones", icon: "headphones" },
  { name: "Speakers", icon: "speaker" },
  { name: "Cameras", icon: "camera" },
  { name: "Wearables", icon: "watch" },
  { name: "Gaming", icon: "gaming" },
];

export default function CategoryNav({ selected, onSelect }: { selected: string | null; onSelect: (name: string) => void }) {
  return <section className="categories shell" aria-label="Shop by category">
    <div className="section-topline"><span>FIND YOUR THING</span><span>01 — BROWSE BY CATEGORY</span></div>
    <div className="category-list">{categories.map((item, index) => <button key={item.name} className={`category-item ${selected === item.name ? "selected" : ""}`} aria-pressed={selected === item.name} onClick={() => onSelect(item.name)}><span className="category-icon"><Icon name={item.icon} size={25} /></span><span>{item.name}</span><small>0{index + 1}</small></button>)}</div>
  </section>;
}
