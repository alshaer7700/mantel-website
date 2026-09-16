import { messageFor, toAppError, type AppError } from "@/lib/api/errors";
import { settle } from "@/lib/api/settle";
import { supabase } from "@/lib/supabaseClient";
import { retryMessage, takeSlot } from "@/lib/limiter";

export type ContactMessageInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

export type FormResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function submitContactMessage(input: ContactMessageInput): Promise<FormResult<string>> {
  const firstName = input.firstName.trim().slice(0, 120);
  const lastName = input.lastName.trim().slice(0, 120);
  const email = input.email.trim().slice(0, 254);
  const phone = input.phone.trim().slice(0, 24);
  const message = input.message.trim().slice(0, 2000);

  if (!email || !EMAIL_RE.test(email) || !message) {
    return { ok: false, error: { kind: "notice", message: "Please check your email and message before sending." } };
  }

  /* Counted only once the message is known to be well-formed — see
     src/lib/limiter.ts. The binding limits are per-email and per-IP in
     supabase/019. */
  const slot = takeSlot("contact");
  if (!slot.allowed) {
    return { ok: false, error: { kind: "rate-limited", message: retryMessage(slot.retryAfterMs) } };
  }

  const { data, error } = await settle(
    supabase.rpc("submit_contact_message", {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      message,
    }),
  );
  if (error) return { ok: false, error: toAppError(error) };
  if (typeof data !== "string" || !data) {
    return { ok: false, error: { kind: "unknown", message: "The message could not be saved." } };
  }
  return { ok: true, value: data };
}

export async function subscribeNewsletter(emailInput: string): Promise<FormResult<boolean>> {
  const email = emailInput.trim().slice(0, 254);
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: { kind: "notice", message: "Please enter a valid email address." } };
  }

  const slot = takeSlot("newsletter");
  if (!slot.allowed) {
    return { ok: false, error: { kind: "rate-limited", message: retryMessage(slot.retryAfterMs) } };
  }

  const { data, error } = await settle(
    supabase.rpc("subscribe_newsletter", { subscriber_email: email }),
  );
  if (error) return { ok: false, error: toAppError(error) };
  if (data !== true) {
    return { ok: false, error: { kind: "unknown", message: "The subscription could not be saved." } };
  }
  return { ok: true, value: true };
}

export function formErrorMessage(error: AppError): string {
  return messageFor(error);
}
