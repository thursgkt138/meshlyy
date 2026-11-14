import Link from "next/link";
import type { ReactNode } from "react";

type Shortcut = { label: string; href: string };
type Props = {
  eyebrow: string;
  title: string;
  description: string;
  shortcuts?: Shortcut[];
  children?: ReactNode;
};

/** Reusable editorial header. Decorative only: never owns order or stock state. */
export function StudioIntro({ eyebrow, title, description, shortcuts = [], children }: Props) {
  return (
    <section className="mesh-studio-intro" aria-label={title}>
      <div className="mesh-studio-intro-copy">
        <span className="mesh-studio-kicker"><span aria-hidden="true" className="mesh-studio-spark">✳</span>{eyebrow}</span>
        <h2>{title}<span aria-hidden="true">.</span></h2>
        <p>{description}</p>
        {shortcuts.length > 0 && <nav aria-label="Quick actions" className="mesh-studio-shortcuts">
          {shortcuts.map(({href,label})=><Link href={href} key={href}>{label}<span aria-hidden="true">↗</span></Link>)}
        </nav>}
      </div>
      <div className="mesh-studio-intro-art" aria-hidden="true">
        <span className="mesh-orbit mesh-orbit-one"/><span className="mesh-orbit mesh-orbit-two"/>
        <span className="mesh-studio-core">m<span>✳</span></span>
        <span className="mesh-studio-node mesh-node-a">01</span>
        <span className="mesh-studio-node mesh-node-b">02</span>
        <span className="mesh-studio-node mesh-node-c">03</span>
      </div>
      {children}
    </section>
  );
}
