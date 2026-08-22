import type { ReactNode } from "react";
import { DISPLAY } from "@/app/components/type";

/*
 * The heading row that sits under every shelf rule: a large display title on
 * the left, and a quiet link or note on the right, sharing a baseline.
 *
 * `as` exists because this row is a page's <h1> on the Café and Objects pages
 * and an <h2> on the home page's three sections. Rendering it always as h2
 * would leave the home page with no h1; always as h1 would give the home page
 * four of them.
 */

type Props = {
  title: ReactNode;
  aside?: ReactNode;
  as?: "h1" | "h2";
};

export function SectionHead({ title, aside, as: Tag = "h2" }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-baseline gap-[var(--s-2)] pt-[var(--s-2)] pb-[var(--s-4)]">
      <Tag
        className={`${DISPLAY} text-[clamp(1.9rem,5vw,3.4rem)] m-0 text-[color:var(--ink)]`}
      >
        {title}
      </Tag>
      {aside && <div className="sm:justify-self-end">{aside}</div>}
    </div>
  );
}
