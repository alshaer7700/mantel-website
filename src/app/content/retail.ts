import retailCandleSticksImage from "@/imports/retail-candle-sticks.jpeg";
import coffeeCollageImage from "@/imports/mood-coffee-collage.jpg";
import retailLighterImage from "@/imports/retail-lighter.png";
import retailCandleImage from "@/imports/retail-candle.png";
import retailMatchaImage from "@/imports/retail-matcha.png";
import retailMatchSticksImage from "@/imports/retail-match-sticks.png";

export type RetailProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tone: string;
};

export type CartLine = {
  product: RetailProduct;
  quantity: number;
};

export const RETAIL_PRODUCTS: RetailProduct[] = [
  {
    id: "matcha-powder",
    name: "Matcha Powder",
    description: "Bright, clean, and quietly grassy.",
    price: 4.5,
    image: retailMatchaImage,
    tone: "matcha",
  },
  {
    id: "candles",
    name: "Candles",
    description: "A soft light for the end of the day.",
    price: 7,
    image: retailCandleImage,
    tone: "candle",
  },
  {
    id: "candle-sticks",
    name: "Candle Sticks",
    description: "For the shelf, the table, and the in-between.",
    price: 5.5,
    image: retailCandleSticksImage,
    tone: "sticks",
  },
  {
    id: "lighters",
    name: "Lighters",
    description: "A small object with a little ceremony.",
    price: 3,
    image: retailLighterImage,
    tone: "lighter",
  },
  {
    id: "match-sticks",
    name: "Match Sticks",
    description: "A little fire for the everyday ritual.",
    price: 2.5,
    image: retailMatchSticksImage,
    tone: "matches",
  },
  {
    id: "custom-bags",
    name: "Custom Bags",
    description: "Made for the things you take with you.",
    price: 6.5,
    image: coffeeCollageImage,
    tone: "bag",
  },
];

export function formatBhd(value: number): string {
  return `BD ${value.toFixed(3)}`;
}
