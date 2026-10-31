import type { IllustrationKind } from "./demo-data";

/** Original line drawings share the same ink, mint and paper palette. */
export function ProductArt({ kind, className = "" }: { kind: IllustrationKind; className?: string }) {
  return <svg className={`product-art ${className}`} viewBox="0 0 160 160" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <ellipse cx="80" cy="137" rx="48" ry="7" fill="currentColor" opacity=".06" stroke="none" />
    {kind === "pantry" && <><path d="M52 45 67 23h34l13 22v86H52Z" fill="#F7F8F5" /><path d="M52 45h62M67 23v22m0-11h36M94 45v86" /><path d="M52 71h42v42H52" fill="#4EDDBB" /><path d="M64 94c2-12 16-12 18 0-5 7-13 7-18 0Z" /><path d="m64 94 18-8" /><path d="M102 63v45" stroke="#A9BDB1" /></>}
    {kind === "bread" && <><path d="M30 100c0-44 25-67 52-67s49 23 49 67v14c0 14-101 14-101 0Z" fill="#E6D9BD" /><path d="m52 72 15-15m5 19 16-16m4 21 15-15M31 108c20 9 78 9 100 0" /><path d="M48 117v9m24-6v8m28-9v8" /></>}
    {kind === "care" && <><rect x="52" y="51" width="57" height="80" rx="9" fill="#4EDDBB" /><path d="M65 51V32h32v19M69 32V20h43v10H85" fill="#F7F8F5" /><rect x="60" y="73" width="41" height="37" rx="2" fill="#F7F8F5" /><path d="M80 80c-16 17-10 22 0 22s16-5 0-22Z" /><path d="M65 119h20" /></>}
    {kind === "cream" && <><path d="m49 27 62 0-8 91H57Z" fill="#D8EADF" /><path d="M49 27v9h62M57 118h46v14H57Z" fill="#4EDDBB" /><circle cx="80" cy="73" r="16" fill="#F7F8F5" /><path d="m72 74 6 6 11-13M58 44h17" /></>}
    {kind === "tech" && <><path d="M36 93V74a44 44 0 0 1 88 0v19" strokeWidth="10" /><path d="M44 79v-5a36 36 0 0 1 72 0v5" stroke="#4EDDBB" strokeWidth="7" /><rect x="27" y="78" width="26" height="45" rx="11" fill="#4EDDBB" /><rect x="107" y="78" width="26" height="45" rx="11" fill="#4EDDBB" /><path d="M37 88v23m80-23v23M53 99h6m42 0h6" /></>}
    {kind === "cable" && <><path d="M56 58V42h19v16m-25 0h31v27H50ZM62 85v26c0 23 51 23 51-3V78" fill="#D8EADF" /><path d="M102 78h23V51h-23Z" fill="#4EDDBB" /><path d="M107 51V36h13v15M58 66h15m34-3h13" /></>}
    {kind === "home" && <><path d="M111 63h9c31 0 27 43-9 43" strokeWidth="6" /><path d="M39 56h74v47c0 32-74 32-74 0Z" fill="#4EDDBB" /><ellipse cx="76" cy="56" rx="37" ry="9" fill="#F7F8F5" /><path d="M61 36c-8-9 9-13 0-22m26 22c-8-9 9-13 0-22M45 125h66" /></>}
    {kind === "notebook" && <><path d="M47 27h66v106H47c-10 0-15-5-15-12V39c0-8 7-12 15-12Z" fill="#4EDDBB" /><path d="M47 27v106m-15-12c0-8 7-12 15-12h66" /><path d="M65 51h29M65 61h22M44 119h69" /><path d="m117 32 10 3-16 66-10-3Z" fill="#F7F8F5" /><path d="m101 98 2 15 8-12" /></>}
  </svg>;
}

export function ShopArt({ category }: { category: IllustrationKind }) {
  return <svg viewBox="0 0 90 70" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M13 24h64v40H13Z" fill="#F7F8F5" /><path d="m8 24 8-17h58l8 17Z" fill="#4EDDBB" /><path d="m28 7-3 17m19-17v17M62 7l3 17M8 24c0 9 15 9 15 0 0 9 15 9 15 0 0 9 15 9 15 0 0 9 15 9 15 0 0 9 14 9 14 0" fill="#4EDDBB" /><path d="M20 39h22v17H20Zm35 0h15v25H55Z" fill="#D8EADF" />
    {category === "pantry" && <path d="m24 48 5-5 4 6 5-3" />}
    {category === "care" && <path d="M31 42v11m-6-6h12" />}
    {category === "tech" && <path d="m32 41-7 8h7l-3 6" />}
    {category === "home" && <path d="m24 49 7-7 7 7m-11-3v8h8v-8" />}
  </svg>;
}
