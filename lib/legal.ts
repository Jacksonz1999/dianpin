import { t, type Locale } from "./i18n";

/**
 * Audit P0-2: the legal pages must not advertise themselves as unfilled
 * drafts, and AI must NOT invent a data controller's identity. Instead the
 * four real-world values are configuration, supplied by the operator in
 * Railway (see README). Until they are set, the text still uses an explicit
 * `{placeholder}` token — but it is no longer preceded by a banner telling
 * every visitor the policy is fake.
 *
 * `EMAIL_FROM` (info@dianpin.eu, already required for the magic-link mail)
 * is a real, monitored mailbox, so it is an honest default for the rights-
 * exercise address. The entity name, tax ID, registered address and
 * jurisdiction cannot be inferred and stay as placeholders until provided.
 */
export type LegalIdentityVars = Record<string, string>;

export function legalIdentityVars(locale: Locale): LegalIdentityVars {
  const placeholder = (key: string) => t(locale, `legal.placeholder.${key}`);
  return {
    entity: process.env.LEGAL_ENTITY_NAME?.trim() || placeholder("entity"),
    nif: process.env.LEGAL_NIF?.trim() || placeholder("nif"),
    address: process.env.LEGAL_ADDRESS?.trim() || placeholder("address"),
    email:
      process.env.LEGAL_CONTACT_EMAIL?.trim() ||
      process.env.EMAIL_FROM?.trim() ||
      placeholder("email"),
    jurisdiction:
      process.env.LEGAL_JURISDICTION?.trim() || placeholder("jurisdiction"),
  };
}
