"use client";

import { useState } from "react";
import AchievementDataPanel from "./achievement-data-panel";
import AchievementFire from "./achievement-fire";

const detailColumns = [
  [
    "Choose a goal that matters to you and set a time limit.",
    "Decide your target and when you want to complete it.",
  ],
  [
    "Put real money behind your goal using a smart contract vault.",
    "Funds stay locked until your goal deadline is reached.",
  ],
  [
    "Every deadline is verifiable and transparent onchain.",
    "Withdraw on success, or route the stake to charity on failure.",
  ],
];

export default function AchivementSec() {
  const [speedBoostKey, setSpeedBoostKey] = useState(0);

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen border-x border-t border-b border-[#D9D9D9] bg-[var(--surface)]">
      <div className="relative mx-auto max-w-6xl border-x border-[#D9D9D9] px-4 pb-10 md:px-6 md:pb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-14 w-14 -translate-x-1/2 -translate-y-1/2"
        >
         
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-14 w-14 -translate-x-1/2 -translate-y-1/2"
        >
         
          <span className="absolute left-21 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-14 w-14 -translate-x-1/2 translate-y-1/2"
        >
         
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 h-14 w-14 -translate-x-1/2 translate-y-1/2"
        >
         
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#D9D9D9]" />
        </div>

        <div className="relative -mx-4 h-[170px] overflow-hidden md:-mx-6 md:h-[300px]">
          <AchievementFire className="h-full w-full" speedBoostKey={speedBoostKey} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-6 md:gap-7">
          <button
            type="button"
            className="bg-[#00FFA6] px-4 py-2 text-base text-black md:px-5 md:py-2.5"
          >
            Wallet connect
          </button>
          <button
            type="button"
            className="bg-[#00FFA6] px-4 py-2 text-base text-black md:px-5 md:py-2.5"
          >
            Start Goal
          </button>

          <button
            type="button"
            onClick={() => setSpeedBoostKey((prev) => prev + 1)}
            className="ml-auto flex cursor-pointer items-center gap-1.5 pt-2 md:pt-0"
          >
            <div className="flex h-7 w-30 overflow-hidden border-2 border-black bg-black">
              <span className="h-full w-[56%] bg-[#19e7ae]" />
            </div>
            <span className="text-xs tracking-wide">Vault</span>
          </button>
        </div>

        <div className="mt-7 grid gap-6 md:mt-8 md:grid-cols-[1fr_1.2fr] md:items-start md:gap-10">
          <p className="max-w-xl text-3xl leading-tight tracking-tight md:max-w-2xl md:text-[37px]">
            Define what you want to achieve and choose a deadline to commit
            yourself.
          </p>
          <div
            aria-hidden
            className="relative h-[124px] w-full overflow-hidden border border-[#dce9dd] md:h-[155px]"
          >
            <AchievementDataPanel className="h-full w-full" />
          </div>
        </div>

        <div className="mt-8 grid gap-5 text-sm leading-relaxed md:mt-12 md:grid-cols-3 md:text-base">
          {detailColumns.map((items) => (
            <ul key={items[0]} className="space-y-1.5">
              {items.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span aria-hidden>&#8226;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
