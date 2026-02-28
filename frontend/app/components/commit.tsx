

export default function Commit() {
  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen border-b border-[#D9D9D9] bg-[var(--surface)]">
      <div className="relative mx-auto max-w-6xl border-x border-[#D9D9D9] px-4 py-7 md:px-6 md:py-10">
      
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-14 w-14 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-14 w-14 translate-x-1/2 -translate-y-1/2"
        >
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>

        <div className="mb-5 flex items-center justify-between md:mb-6">
          <h2 className="text-4xl tracking-tight md:text-[44px]">Ready to commit for real?</h2>
          <button
            type="button"
            className="bg-[#00FFA6] px-5 py-2.5 text-base text-black transition-colors hover:bg-[#00d98d]"
          >
            Start Goal
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="relative min-h-[520px] overflow-hidden border border-[#7d7d7d] bg-[#0f1012]">
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/dream.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(3,12,24,0.8)] via-[rgba(3,12,24,0.5)] to-[rgba(3,3,5,0.9)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_28%,rgba(255,255,255,0.22)_0%,transparent_24%),radial-gradient(circle_at_18%_36%,rgba(255,255,255,0.18)_0%,transparent_14%),radial-gradient(circle_at_60%_86%,rgba(255,255,255,0.2)_0%,transparent_10%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.55)_100%)]" />

            <div className="absolute left-4 right-4 top-4 text-[11px] leading-relaxed text-white">
              Create your first goal and lock in your commitment.
              <br />
              Success returns your money. Failure donates it.
            </div>

          </div>

          <div className="grid gap-3 md:grid-rows-[1fr_auto]">
            <div className="border border-[#5ecfd0] bg-[#15d7d1] p-3 md:p-4">
              <p className="text-[33px] leading-none md:text-[38px]">Where Goal Begins.</p>

              <div className="relative mt-5 h-24 overflow-hidden text-5xl font-extrabold">
                
              </div>

              <p className="mt-5 max-w-[420px] text-[30px] leading-snug text-white md:text-[35px]">
                Turn your intentions into action with real accountability powered by smart contracts
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-[#5ecfd0] bg-[#00f6ad] p-3 text-[13px] leading-snug text-black md:text-[15px]">
                Create your first goal and turn your intentions into real commitment. By putting money
                behind what you want to achieve you remove excuses and build powerful accountability that
                drives action.
              </div>

              <div className="border border-[#525252] bg-[#202126] p-3 text-[13px] leading-snug text-[#48f2df] md:text-[15px]">
                Lock funds on your goals using a secure on-chain vault designed to enforce commitment
                without intermediaries. Your money stays protected by smart contract logic until the
                deadline is reached.
              </div>
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-14 w-14 -translate-x-1/2 translate-y-1/2"
        >
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 h-14 w-14 translate-x-1/2 translate-y-1/2"
        >
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[#D9D9D9]" />
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>
      </div>
    </section>
  );
}
