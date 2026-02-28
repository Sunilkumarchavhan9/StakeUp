import Link from "next/link";

import BrandLogo from "./brand-logo";

type SidebarBrandProps = {
  sectionLabel: string;
  dark?: boolean;
};

export default function SidebarBrand({
  sectionLabel,
  dark = false,
}: SidebarBrandProps) {
  const toneClass = dark ? "text-white" : "text-[var(--ink)]";
  const subtitleClass = dark ? "text-white/40" : "text-[var(--ink)]/55";

  return (
    <div className="border-b border-[var(--card-border)] pb-4">
      <Link href="/" className={`block w-full ${toneClass}`}>
        <BrandLogo className="h-9 w-full max-w-[180px]" />
      </Link>
      <p
        className={`mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.35em] ${subtitleClass}`}
      >
        {sectionLabel}
      </p>
    </div>
  );
}
