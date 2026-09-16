/**
 * Resolve internal order_number from Paystack metadata or transaction reference.
 * References are initialized as `PAY-<order_number>-<unix_ms>` so we strip the
 * trailing timestamp; order numbers themselves contain hyphens (e.g. ORD-ts-rand).
 */
export function orderNumberFromPaystackReference(
  reference: string | undefined,
  metadataOrderId?: string | null,
): string | undefined {
  if (metadataOrderId && typeof metadataOrderId === 'string' && metadataOrderId.trim()) {
    return metadataOrderId.trim();
  }
  if (!reference || typeof reference !== 'string') return undefined;
  if (!reference.startsWith('PAY-')) return undefined;
  const rest = reference.slice(4);
  const lastHyphen = rest.lastIndexOf('-');
  if (lastHyphen <= 0) return undefined;
  const suffix = rest.slice(lastHyphen + 1);
  if (/^\d{10,}$/.test(suffix)) {
    return rest.slice(0, lastHyphen);
  }
  return rest;
}
