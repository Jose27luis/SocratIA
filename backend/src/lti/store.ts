interface StateEntry {
  readonly nonce: string;
  readonly expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const states = new Map<string, StateEntry>();

export function saveState(state: string, nonce: string): void {
  states.set(state, { nonce, expiresAt: Date.now() + TTL_MS });
}

export function consumeState(state: string): string | null {
  const entry = states.get(state);
  states.delete(state);
  if (entry === undefined || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.nonce;
}
