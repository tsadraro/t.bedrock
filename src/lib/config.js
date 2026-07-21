// T.Bedrock & Co. — Compliance Configuration
// All statutory values are loaded from SystemConfig entity at runtime.
// These are fallback defaults only — never rely on these in production.
// Update via Admin → System Settings, not by editing this file.

export const CONFIG_DEFAULTS = {
  MIN_LEASE_MONTHS: 24,
  MAX_ADVANCE_MONTHS: 2,
  ANNUAL_RENT_INCREASE_CAP_PERCENT: 11.5,
  LEGAL_REVIEW_COMPLETE: false,
  ESCROW_PROVIDER_MODE: 'stub',
  FAYDA_API_MODE: 'stub',
  CONSENT_TEXT_VERSION: '1.0.0',
};

// ── Stub: Fayda National ID verification ──────────────────────────────────────
// Replace this function body with a real HTTP call to the Fayda API
// when the partnership and legal review are in place.
// Endpoint ref: https://fayda.et (integration pending)
export async function verifyFaydaId(faydaId, tenantData) {
  console.warn('[STUB] verifyFaydaId called — returning mock pending status. Replace with real Fayda API call.');
  return {
    status: 'pending',
    fayda_id: faydaId,
    message: 'Fayda ID verification is pending. Real API integration not yet active.',
    stub: true,
    timestamp: new Date().toISOString(),
  };
}

// ── Stub: Escrow provider ─────────────────────────────────────────────────────
// T.Bedrock does NOT hold funds. These stubs delegate to a licensed bank/
// mobile money operator. Replace stub bodies with real partner API calls.
export const escrowProvider = {
  async createHold({ leaseId, tenantId, landlordId, amount, currency = 'ETB', reason }) {
    console.warn('[STUB] escrowProvider.createHold — mock response. Replace with licensed escrow partner API.');
    return {
      success: true,
      hold_id: `HOLD-STUB-${Date.now()}`,
      amount,
      currency,
      status: 'held',
      stub: true,
      timestamp: new Date().toISOString(),
    };
  },

  async release({ holdId, leaseId, releaseTo, amount, reason }) {
    console.warn('[STUB] escrowProvider.release — mock response.');
    return {
      success: true,
      hold_id: holdId,
      status: 'released',
      released_to: releaseTo,
      amount,
      stub: true,
      timestamp: new Date().toISOString(),
    };
  },

  async forfeit({ holdId, leaseId, forfeitureClauseId, amount, reason }) {
    console.warn('[STUB] escrowProvider.forfeit — mock response.');
    return {
      success: true,
      hold_id: holdId,
      status: 'forfeited',
      forfeiture_clause_id: forfeitureClauseId,
      amount,
      stub: true,
      timestamp: new Date().toISOString(),
    };
  },

  async dispute({ holdId, leaseId, disputeId, raisedByRole, reason }) {
    console.warn('[STUB] escrowProvider.dispute — mock response.');
    return {
      success: true,
      hold_id: holdId,
      status: 'disputed',
      dispute_id: disputeId,
      stub: true,
      timestamp: new Date().toISOString(),
    };
  },
};

// ── i18n string keys (EN + Amharic scaffolding) ──────────────────────────────
export const STRINGS = {
  en: {
    app_name: 'T.Bedrock & Co.',
    tagline: 'Secure Rental Escrow & Tenant Screening — Addis Ababa',
    role_tenant: 'Tenant',
    role_landlord: 'Landlord / Agent',
    role_admin: 'T.Bedrock Admin',
  },
  am: {
    // Amharic — placeholder strings, to be reviewed and completed with native speaker
    app_name: 'ቲ.ቤድሮክ እና ኩባንያ',
    tagline: 'ደህንነቱ የተጠበቀ የኪራይ ማስያዣ — አዲስ አበባ',
    role_tenant: 'ተከራይ',
    role_landlord: 'ቤት አከራይ / ወኪል',
    role_admin: 'አስተዳዳሪ',
  },
};