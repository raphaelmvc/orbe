export type EntityId = string & { readonly __brand: 'EntityId' };

export function entityId(value: string): EntityId {
  const normalized = value.trim();

  if (normalized.length === 0) throw new Error('Entity ID is required');

  return normalized as EntityId;
}
