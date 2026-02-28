import BnsSvg from "./bbnssvg";
import BusinessGridShader from "./business-grid-shader";

const options = [
  {
    title: "Option 1 \u2014 Brain vs Temptation",
    lines: ["Brain holding coin", "Temptation pulling opposite", "Shows discipline conflict."],
  },
  {
    title: "Option 2 \u2014 Motivation Graph",
    lines: ["Normal motivation \u2192 goes down", "With money stake \u2192 stays high", "Very clear."],
  },
  {
    title: "Option 3 \u2014 Locking Commitment",
    lines: ["Person locking coin into vault with", "determination."],
  },
];

export default function Business() {
  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen border-x border-b border-[#D9D9D9] bg-[var(--surface)]">
      <div className="relative mx-auto max-w-6xl border-x border-[#D9D9D9] px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-10">
        <div className="grid gap-6 md:grid-cols-[320px_1fr] md:gap-8">
          <aside className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#888] px-3 py-1 text-xs">
              <span>Q3</span>
              <span className="h-3.5 w-px bg-[#888]" />
              <span>Business Update</span>
            </div>

            <h2 className="max-w-[270px] text-[42px] leading-[1.05] tracking-tight">
              Introducing Next-gen Stake Up vault
            </h2>

            <div className="space-y-4 pt-2">
              {options.map((item) => (
                <div key={item.title} className="border-t border-[#888] pt-2.5">
                  <h3 className="text-[28px] leading-none">{item.title}</h3>
                  <div className="mt-1.5 text-[12px] leading-snug">
                    {item.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="h-[132px] overflow-hidden border border-[#8f8f8f] bg-black">
              <BusinessGridShader className="h-full w-full" />
            </div>
          </aside>

          <div className="relative min-h-[590px] overflow-hidden border border-[#8a8a8a] bg-[#3f3f42]">
  
  <div className="absolute inset-0 flex items-center justify-center">
    <BnsSvg />
  </div>

</div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-14 w-14 -translate-x-1/2 -translate-y-1/2"
        >
          
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-14 w-14 translate-x-1/2 -translate-y-1/2"
        >
         
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>
      </div>
    </section>
  );
}
