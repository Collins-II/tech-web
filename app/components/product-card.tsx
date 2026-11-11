import Icon from "./store-icon";

export type Product = {
  id: number;
  brand: string;
  name: string;
  category: string;
  price: number;
  oldPrice: number | null;
  color: string;
  tag: string;
  image: string;
  stock: number;
};

export const money = (value: number) => `K ${value.toFixed(2)}`;

export default function ProductCard({ product, saved, onToggleSaved, onAdd }: {
  product: Product;
  saved: boolean;
  onToggleSaved: (id: number) => void;
  onAdd: (id: number) => void;
}) {
  return <article className="product-card">
    <div className="product-image" style={{ backgroundImage: `url("${product.image}")` }}>
      <span className="product-tag">{product.tag}</span>
      <button className={`heart-button ${saved ? "saved" : ""}`} aria-label={`${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} saved items`} aria-pressed={saved} onClick={() => onToggleSaved(product.id)}><Icon name="heart" size={19} /></button>
      <button className="quick-add" disabled={product.stock <= 0} onClick={() => onAdd(product.id)}><Icon name="plus" size={16} /> {product.stock > 0 ? "Add to bag" : "Out of stock"}</button>
    </div>
    <div className="product-info"><div className="product-meta"><span>{product.brand}</span><span>{product.stock > 0 ? "In stock" : "Out of stock"}</span></div><h3>{product.name}</h3><p>{product.color}</p><div className="product-price"><strong>{money(product.price)}</strong>{product.oldPrice && <del>{money(product.oldPrice)}</del>}<button disabled={product.stock <= 0} aria-label={`Add ${product.name} to bag`} onClick={() => onAdd(product.id)}><Icon name="plus" size={17} /></button></div></div>
  </article>;
}
