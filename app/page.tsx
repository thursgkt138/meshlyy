import { BasketDemo } from "./components/basket";
import { DemoProvider } from "./components/demo-context";
import { Discovery } from "./components/discovery";
import { Brand, Header } from "./components/header";
import { PickupDemo } from "./components/pickup";
import { RetailerDemo } from "./components/retailer";
import { Arrow } from "./components/ui";

export default function Home() {
  return <DemoProvider>
    <Header />
    <main id="main" tabIndex={-1}>
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-title-block"><p className="eyebrow"><span className="tiny-star" aria-hidden="true">✳</span> A GOOD DAY STARTS NEARBY</p><h1 id="hero-title">A little closer.<br /><em>A lot more local.</em></h1></div>
        <div className="hero-aside"><span className="hero-edition">THE NEIGHBOURHOOD EDIT / 01</span><p>That thing you need?{" "}<br />It might be just around<br className="desktop-break" /> the corner.</p><a className="editorial-link" href="#discover">Take a look around <Arrow down /></a><span className="hero-model">Discover nearby. Reserve. Pick up yourself.</span></div>
      </section>
      <Discovery />
      <div className="manifesto shell"><span className="small-caps">LESS SCROLLING.<br />MORE STROLLING.</span><p>The everyday has a neighbourhood.<br /><em>Let’s get you reacquainted.</em></p><span className="manifesto-flower" aria-hidden="true">✳</span></div>
      <BasketDemo />
      <PickupDemo />
      <RetailerDemo />
      <section className="closing shell" aria-labelledby="closing-title"><div><p className="eyebrow">A FEW GOOD THINGS, CLOSE TO HOME</p><h2 id="closing-title">Meet you<br /><em>around the corner.</em></h2></div><a className="closing-link" href="#discover" aria-label="Explore the neighbourhood preview"><Arrow /></a><p className="closing-note">A preview of a more local everyday.<br />Built around shops. Collected by you.</p></section>
    </main>
    <footer className="site-footer"><div className="shell footer-inner"><Brand /><span>Your neighbourhood. Connected.</span><span>Pickup-only commerce · Product preview</span><a href="#main">Back to top ↑</a></div></footer>
  </DemoProvider>;
}
