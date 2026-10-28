/**
 * Curve errors the shipped levels already had when the rules arrived (#88). Universe 1 was retuned in #89,
 * which emptied this list. The tests require it to match the real errors exactly, so a fixed level must be
 * removed from here and a new error can never slip in; keep it empty unless a known error is tracked in a ticket.
 */
export const KNOWN_CURVE_ERRORS: readonly string[] = [];
