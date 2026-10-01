import type { ReactNode } from "react";
import { textStyleCss, type PageStyles } from "@/lib/content/pages";

/*
 * Text from Website pages in the font and size chosen there. A span inside
 * the element the design already styles, so a percentage size is of that
 * element's own size. Unstyled text is passed through untouched.
 */
export function Styled({ styles, field, children }: { styles?: PageStyles; field: string; children: ReactNode }) {
  const css = textStyleCss(styles?.[field]);
  return css ? <span style={css}>{children}</span> : <>{children}</>;
}
