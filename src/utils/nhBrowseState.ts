type BrowseState = {
  context: string;
  createdAt: number;
};

const TTL_MS = 1000 * 60 * 60 * 6;
const stateMap = new Map<string, BrowseState>();

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of stateMap.entries()) {
    if (now - value.createdAt > TTL_MS) {
      stateMap.delete(key);
    }
  }
}

export function registerBrowseContext(context: string) {
  cleanupExpired();
  const existing = [...stateMap.entries()].find(([, value]) => value.context === context);
  if (existing) {
    existing[1].createdAt = Date.now();
    return existing[0];
  }

  let id = randomId();
  while (stateMap.has(id)) {
    id = randomId();
  }

  stateMap.set(id, {
    context,
    createdAt: Date.now(),
  });

  return id;
}

export function getBrowseContext(id: string) {
  cleanupExpired();
  const state = stateMap.get(id);
  if (!state) return null;
  state.createdAt = Date.now();
  return state.context;
}
