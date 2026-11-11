"use client";

import { useState } from "react";

type CheckoutItem = { id: number; quantity: number; expectedPrice: number };
type CheckoutResult = { reference: string; total: number };

export default function Checkout({ items, onSuccess, onBack, onPending }: {
  items: CheckoutItem[];
  onSuccess: (result: CheckoutResult) => void;
  onBack: () => void;
  onPending: (pending: boolean) => void;
}) {
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    onPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      customer: {
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
      },
      fulfillment,
      address: fulfillment === "delivery" ? String(form.get("address") ?? "").trim() : "",
      items,
    };

    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
      const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const stored = sessionStorage.getItem("goodform-checkout");
      let requestId = crypto.randomUUID();
      if (stored) {
        const previous: { fingerprint: string; requestId: string } = JSON.parse(stored);
        if (previous.fingerprint === fingerprint) requestId = previous.requestId;
      }
      sessionStorage.setItem("goodform-checkout", JSON.stringify({ fingerprint, requestId }));
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestId }),
      });
      const data: { reference?: string; total?: number; error?: string } = await response.json();
      if (!response.ok || !data.reference || typeof data.total !== "number") {
        throw new Error(data.error || "Could not place your order. Please try again.");
      }
      sessionStorage.removeItem("goodform-checkout");
      onSuccess({ reference: data.reference, total: data.total });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not place your order. Please try again.");
    } finally {
      setPending(false);
      onPending(false);
    }
  }

  return <form className="checkout-form" onSubmit={submit}>
    <button type="button" className="checkout-back" onClick={onBack} disabled={pending}>← Back to bag</button>
    <h3>Where should it go?</h3>
    <p>Pay in cash when your order is delivered or collected.</p>
    <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
    <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Phone<input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={30} /></label>
    <label>Fulfillment<select value={fulfillment} onChange={(event) => setFulfillment(event.target.value as "delivery" | "pickup")}><option value="delivery">Delivery</option><option value="pickup">Pickup</option></select></label>
    {fulfillment === "delivery" && <label>Delivery address<textarea name="address" autoComplete="street-address" required minLength={5} maxLength={300} rows={3} /></label>}
    <p>{fulfillment === "delivery" ? "Delivery charges are arranged separately after ordering and are not included in the total." : "We will contact you to arrange pickup."}</p>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <button className="button button-dark checkout-submit" disabled={pending} type="submit">{pending ? "Placing order..." : "Place cash order"} <span>→</span></button>
  </form>;
}
