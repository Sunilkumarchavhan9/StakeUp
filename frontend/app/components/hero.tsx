import Image from "next/image";
import Link from "next/link";
import SvgSign from "./logoofascii";

const pixelBlocks = [
  { left: "66%", top: "18%" },
  { left: "78%", top: "18%" },
  { left: "90%", top: "18%" },
  { left: "72%", top: "39%" },
  { left: "84%", top: "39%" },
  { left: "78%", top: "60%" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-10 md:px-8 md:pb-12">
      <div className="pointer-events-none absolute inset-0 right-60 bottom-110">
        <div className="absolute inset-0 flex items-center justify-center">
          <SvgSign className="h-[550px] w-[900px]" />
        </div>
      </div>

      <div className="relative min-h-[420px]">
        <h1 className="max-w-lg text-4xl leading-tight tracking-tight md:text-5xl">
          Bet on yourself.
          <br />
          Put money behind your goals.

        </h1>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-full bg-[#00FFA6] px-6 py-3 font-bold text-black transition-colors hover:bg-[var(--brand-strong)]"
        >
          Start Goal
        </Link>

        {pixelBlocks.map((block) => (
          <span
            key={`${block.left}-${block.top}`}
            aria-hidden
            className="absolute hidden h-14 w-14 bg-gradient-to-b from-[var(--brand)] to-[var(--brand-strong)] md:block"
            style={{ left: block.left, top: block.top }}
          />
        ))}
      </div>

      <p className="mx-auto mt-3 max-w-xl text-center text-lg leading-relaxed md:mt-6">
        Lock funds on your goals.
        <br />
        Succeed and withdraw. Fail and it goes to charity.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        <Image
          src="/hero-panel.svg"
          alt="StakeUp protocol stats panel"
          width={1427}
          height={267}
          className="h-auto w-full"
          priority
        />
      </div>
    </section>
  );
}
