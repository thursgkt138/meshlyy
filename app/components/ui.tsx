import type { ReactNode } from "react";

export function Arrow({ down = false }: { down?: boolean }) {
  return <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" style={down ? { transform: "rotate(90deg)" } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}
export function PreviewLabel({ children = "Interactive preview", dark = false }: { children?: ReactNode; dark?: boolean }) {
  return <span className={`preview-label${dark ? " on-dark" : ""}`}><span aria-hidden="true">◌</span>{children}</span>;
}
export function SectionIntro({ number, label, title, children }: { number: string; label: string; title: ReactNode; children: ReactNode }) {
  return <div className="section-intro"><p className="eyebrow"><span>{number}</span> {label}</p><h2>{title}</h2><div className="intro-note">{children}</div></div>;
}
