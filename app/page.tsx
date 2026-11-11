"use client";

import { useEffect, useMemo, useState } from "react";
import Checkout from "./checkout";
import CategoryNav from "./components/category-nav";
import Hero from "./components/hero";
import Icon from "./components/store-icon";
import ProductCard, { money, type Product } from "./components/product-card";

export default function Home() {
  const [category, setCategory] = useState("All things");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [bag, setBag] = useState<Record<number, number>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ reference: string; total: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load catalog");
        const data: { products: Product[] } = await response.json();
        setProducts(data.products);
        setCatalogState("ready");
      } catch {
        if (!controller.signal.aborted) setCatalogState("error");
      }
    }
    void loadProducts();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => products.filter((product) =>
    (category === "All things" || product.category === category) &&
    (!showFavorites || favorites.includes(product.id)) &&
    `${product.brand} ${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase().trim())
  ), [products, category, query, showFavorites, favorites]);
  const bagCount = Object.values(bag).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = products.reduce((sum, product) => sum + product.price * (bag[product.id] || 0), 0);

  function changeQuantity(id: number, change: number) {
    setBag((current) => {
      const next = { ...current };
      const quantity = (next[id] || 0) + change;
      const product = products.find((item) => item.id === id);
      if (change > 0 && (!product || quantity > product.stock)) return current;
      if (quantity <= 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  }

  function selectCategory(name: string) {
    setCategory(name);
    setShowFavorites(false);
    document.getElementById("the-shelf")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <div className="announcement"><span>GOOD TECH. GOOD LIFE.</span><span>Delivery and pickup <span className="announcement-star">✳</span> A little joy, delivered.</span><a href="#visit">Come say hello <span>↗</span></a></div>
      <header className="header">
        <div className="header-main shell">
          <a className="logo" href="#" aria-label="Goodform home"><span className="logo-mark">g<span>.</span></span><span className="logo-word">goodform<span>®</span><small>TECH FOR LIVING</small></span></a>
          <nav className="desktop-nav" aria-label="Main navigation"><a href="#the-shelf">Shop all</a><a href="#the-shelf" onClick={() => selectCategory("Headphones")}>Sound</a><a href="#the-shelf" onClick={() => selectCategory("Cameras")}>Lifestyle</a><a href="#visit">Our story</a></nav>
          <div className="header-actions">
            <button className="icon-button" aria-label="Search products" onClick={() => setSearchOpen(!searchOpen)}><Icon name="search" /></button>
            <button className={`icon-button favorite-header ${showFavorites ? "active" : ""}`} aria-label="Show saved products" onClick={() => { setShowFavorites(!showFavorites); setCategory("All things"); document.getElementById("the-shelf")?.scrollIntoView({ behavior: "smooth" }); }}><Icon name="heart" />{favorites.length > 0 && <span className="mini-count">{favorites.length}</span>}</button>
            <button className="bag-button" onClick={() => setBagOpen(true)} aria-label={`Open bag, ${bagCount} items`}><Icon name="bag" /><span>Bag</span><span className="bag-count">{bagCount}</span></button>
          </div>
        </div>
        {searchOpen && <div className="search-bar shell"><Icon name="search" /><input autoFocus aria-label="Search products" placeholder="What are you looking for?" value={query} onChange={(event) => { setQuery(event.target.value); setCategory("All things"); setShowFavorites(false); }} /><button onClick={() => { setSearchOpen(false); setQuery(""); }} aria-label="Close search"><Icon name="close" /></button><a href="#the-shelf" onClick={() => setSearchOpen(false)}>See results <Icon name="arrow" size={16} /></a></div>}
      </header>

      <main>
        <Hero onSelectCategory={(name) => { setQuery(""); selectCategory(name); }} />

        <section className="intro shell">
          <div><p className="eyebrow"><span className="orange-dot" /> A DIFFERENT KIND OF TECH STORE</p><h2>Good things live here<span>.</span></h2></div>
          <p>Thoughtful tech, picked for the way you actually live. No noise, no jargon. Just really good stuff.</p>
        </section>

        <CategoryNav selected={showFavorites ? null : category} onSelect={selectCategory} />

        <section id="the-shelf" className="shelf shell">
          <div className="shelf-heading"><div><p className="eyebrow"><span className="orange-dot" /> THE GOODFORM EDIT</p><h2>{showFavorites ? "Your saved things" : category === "All things" ? "The good stuff." : category + "."}</h2><p>{showFavorites ? "All the things that caught your eye." : "Consider this your shortcut to the good stuff."}</p></div><div className="shelf-heading-right"><span>CURATED WITH CARE <span>✳</span></span><button onClick={() => { setCategory("All things"); setShowFavorites(false); setQuery(""); }}>View all products <Icon name="arrow" size={17} /></button></div></div>
          {catalogState === "ready" && products.some((product) => product.tag === "SAMPLE") && <p className="checkout-note">Sample catalog: prices and stock are estimates and need verification.</p>}
          <div className="product-grid">
            {filtered.map((product) => <ProductCard key={product.id} product={product} saved={favorites.includes(product.id)} onToggleSaved={(id) => setFavorites((current) => current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id])} onAdd={(id) => changeQuantity(id, 1)} />)}
          </div>
          {catalogState === "loading" && <div className="empty-state" role="status">Loading products...</div>}
          {catalogState === "error" && <div className="empty-state" role="alert">The catalog is temporarily unavailable. Please try again later.</div>}
          {catalogState === "ready" && filtered.length === 0 && <div className="empty-state"><p>No good things found just yet.</p><button onClick={() => { setCategory("All things"); setShowFavorites(false); setQuery(""); }}>Browse all products <Icon name="arrow" size={16} /></button></div>}
        </section>

        <section className="promise shell"><div><Icon name="box" size={25} /><span><strong>Good things, delivered.</strong><small>Delivery pricing arranged separately</small></span></div><div><Icon name="spark" size={25} /><span><strong>Only the good stuff.</strong><small>Thoughtfully picked, always</small></span></div><div><Icon name="headphones" size={25} /><span><strong>Real people, real help.</strong><small>Here whenever you need us</small></span></div></section>

        <section id="visit" className="visit shell"><div className="visit-image" /><div className="visit-copy"><p className="eyebrow"><span className="orange-dot" /> MORE THAN A STORE</p><h2>Come on in.<br /><em>Stay a while.</em></h2><p>We believe the best way to find your thing is to experience it. So take your time, play around, and make yourself at home.</p><a className="button button-dark" href="https://wa.me/260769537411" aria-label="Say hello on WhatsApp">Say hello <Icon name="arrow" size={18} /></a><div className="visit-note"><Icon name="pin" size={18} /><span>GOOD PEOPLE. GOOD TECH. GOOD VIBES.</span></div></div></section>
      </main>
      <footer className="footer"><div className="shell footer-inner"><div><a className="footer-logo" href="#">goodform<span>®</span></a><p>A little more joy in the everyday.</p></div><div><span>EXPLORE</span><a href="#the-shelf">Shop the edit</a><a href="#visit">Our story</a></div><div><span>GOOD TO KNOW</span><a href="#visit">Visit us</a><a href="mailto:hello@goodform.example">Get in touch</a></div><div className="footer-signoff">MADE FOR<br /><em>real life.</em> <span>✳</span></div></div><div className="shell footer-bottom"><span>© 2024 GOODFORM. ALL GOOD.</span><span>GOOD TECH FOR GOOD DAYS ↗</span></div></footer>

      {bagOpen && <div className="drawer-backdrop" onClick={() => { if (!checkoutBusy) { setBagOpen(false); setCheckoutOpen(false); setConfirmation(null); } }}><aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title" onClick={(event) => event.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow"><span className="orange-dot" /> THE GOOD STUFF</p><h2 id="bag-title">{checkoutOpen ? "Checkout" : "Your bag"} <small>({bagCount})</small></h2></div><button className="icon-button" aria-label="Close bag" disabled={checkoutBusy} onClick={() => { setBagOpen(false); setCheckoutOpen(false); setConfirmation(null); }}><Icon name="close" /></button></div>{confirmation ? <div className="bag-empty"><Icon name="spark" size={40} /><h3>Order received.</h3><p>Reference: {confirmation.reference}</p><p>Items total: {money(confirmation.total)}. We&apos;ll contact you to arrange your order.</p><button className="button button-dark" onClick={() => { setBagOpen(false); setCheckoutOpen(false); setConfirmation(null); }}>Continue shopping <Icon name="arrow" size={17} /></button></div> : checkoutOpen ? <Checkout items={products.filter((product) => bag[product.id]).map((product) => ({ id: product.id, quantity: bag[product.id], expectedPrice: product.price }))} onBack={() => setCheckoutOpen(false)} onPending={setCheckoutBusy} onSuccess={(result) => { setProducts((current) => current.map((product) => ({ ...product, stock: Math.max(0, product.stock - (bag[product.id] || 0)) }))); setBag({}); setConfirmation(result); }} /> : bagCount === 0 ? <div className="bag-empty"><Icon name="bag" size={40} /><h3>Nothing in here yet.</h3><p>Let&apos;s find you something good.</p><button className="button button-dark" onClick={() => { setBagOpen(false); document.getElementById("the-shelf")?.scrollIntoView({ behavior: "smooth" }); }}>Explore the shelf <Icon name="arrow" size={17} /></button></div> : <><div className="bag-items">{products.filter((product) => bag[product.id]).map((product) => <div className="bag-item" key={product.id}><div className="bag-item-image" style={{ backgroundImage: `url("${product.image}")` }} /><div><small>{product.brand}</small><h3>{product.name}</h3><p>{money(product.price)}</p><div className="quantity"><button aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)}><Icon name="minus" size={14} /></button><span>{bag[product.id]}</span><button aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, 1)}><Icon name="plus" size={14} /></button></div></div></div>)}</div><div className="drawer-bottom"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Delivery charges will be arranged separately.</p><button className="button button-dark checkout-submit" onClick={() => setCheckoutOpen(true)}>Continue to checkout <Icon name="arrow" size={17} /></button></div></>}</aside></div>}
    </>
  );
}
