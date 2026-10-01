import { toAppError } from "@/lib/api/errors";
import { settle } from "@/lib/api/settle";
import { supabase } from "@/lib/supabaseClient";
import type { FormResult } from "@/lib/api/forms";

/*
 * The stamp card, from the customer's side (supabase/038). A card's number is
 * the customer's mobile; its private link (bymantel.com/wallet?t=…) shows the
 * live count and offers the Apple Wallet pass.
 */

export type StampCard = {
  name: string;
  phone: string;
  stamps: number;
  needed: number;
  reward: string;
  enabled: boolean;
};

export type MyLoyalty =
  | { needs_phone: true; stamps_needed: number; reward: string }
  | (StampCard & { needs_phone?: false; pass_token: string });

/** The .pkpass, served through netlify.toml's /wallet-pass proxy. */
export const walletPassUrl = (token: string) => `/wallet-pass?t=${encodeURIComponent(token)}`;
export const walletPageUrl = (token: string) => `/wallet?t=${encodeURIComponent(token)}`;

export async function fetchWalletCard(token: string): Promise<FormResult<StampCard | null>> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: true, value: null };
  const { data, error } = await settle(supabase.rpc("loyalty_card_public", { p_token: token }));
  if (error) return { ok: false, error: toAppError(error) };
  return { ok: true, value: (data as StampCard | null) ?? null };
}

/** Null when the stamp card is switched off or nobody is signed in. */
export async function fetchMyLoyalty(): Promise<FormResult<MyLoyalty | null>> {
  const { data, error } = await settle(supabase.rpc("my_loyalty"));
  if (error) return { ok: false, error: toAppError(error) };
  return { ok: true, value: (data as MyLoyalty | null) ?? null };
}
