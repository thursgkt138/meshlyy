"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { products, type Category } from "./demo-data";

function useDemoState() {
  const [category, setCategory] = useState<Category | "all">("all");
  const [store, setStore] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [basket, setBasket] = useState<Record<string, number>>({ milk: 1, cup: 1 });
  const [announcement, announce] = useState("");
  function changeQuantity(id: string, delta: number) {
    setBasket(current => ({ ...current, [id]: Math.min(9, Math.max(0, (current[id] ?? 0) + delta)) }));
    const product = products.find(item => item.id === id);
    announce(`${product?.name}: ${Math.min(9, Math.max(0, (basket[id] ?? 0) + delta))} in preview basket.`);
  }
  function chooseCategory(value: Category | "all") {
    setCategory(value); setStore(null); setQuery("");
  }
  const count = Object.values(basket).reduce((sum, quantity) => sum + quantity, 0);
  return { category, chooseCategory, store, setStore, query, setQuery, basket, changeQuantity, count, announcement };
}

const DemoContext = createContext<ReturnType<typeof useDemoState> | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useDemoState();
  return <DemoContext.Provider value={state}>{children}<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{state.announcement}</div></DemoContext.Provider>;
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("Demo components require DemoProvider");
  return value;
}
