
import AchivementSec from "./components/achivementSec";
import Business from "./components/business";
import Commit from "./components/commit";
import Hero from "./components/hero";
import Navbar from "./components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--surface)] px-4 py-4 text-[var(--ink)] md:px-6">
      <div className="soft-grid mx-auto max-w-6xl border-x border-[#D9D9D9]">
        <Navbar />
        <Hero />
        <div id="how-it-works">
          <AchivementSec />
        </div>
        <div id="features">
          <Business />
        </div>
        <Commit />
      </div>
    </div>
  );
}
