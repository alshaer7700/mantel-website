import { createContext, useContext } from "react";

/*
 * How big the dashboard's text is, chosen in My account and kept on this
 * device (like Colours). admin.css multiplies every font size by
 * --adm-text-scale, so only text grows: buttons and spacing stay put.
 */
export type TextSize = "small" | "normal" | "large" | "xlarge";
export const TEXT_SIZES: readonly TextSize[] = ["small", "normal", "large", "xlarge"];
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.9, normal: 1, large: 1.15, xlarge: 1.3 };
export const TEXT_SIZE_KEY = "mantel-admin-text-size";

export const TextSizeContext = createContext<{ size: TextSize; setSize: (s: TextSize) => void }>({
  size: "normal",
  setSize: () => {},
});

export const useTextSize = () => useContext(TextSizeContext);
