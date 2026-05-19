/**
 * Simple per-user rate limiter middleware for grammY.
 * No external dependencies.
 */

/**
 * @param {Object} opts
 * @param {number} opts.timeFrame - Window in ms (default 10000)
 * @param {number} opts.limit - Max requests per window (default 3)
 * @param {Function} opts.onLimitExceeded - Called when limit hit
 */
export function limit({ timeFrame = 10_000, limit: max = 3, onLimitExceeded } = {}) {
  /** @type {Map<number, {count: number, reset: number}>} */
  const store = new Map();

  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    const now = Date.now();
    let entry = store.get(userId);

    if (!entry || now > entry.reset) {
      entry = { count: 1, reset: now + timeFrame };
      store.set(userId, entry);
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      if (onLimitExceeded) return onLimitExceeded(ctx, next);
      return;
    }

    return next();
  };
}
