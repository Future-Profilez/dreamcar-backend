const crypto = require("crypto");

/**
 * Random ticket-number allocation (Option A — keyed permutation).
 *
 * Maps a sequential purchase POSITION (0, 1, 2 …) to a scattered, unique
 * ticket number inside [0, totalTickets) using a keyed balanced Feistel
 * network with cycle-walking. Properties:
 *   - bijection: two different positions can never produce the same number
 *     (no duplicates, no collision retries)
 *   - deterministic: same (position, N, key) always yields the same number,
 *     so it can be recomputed/verified later without storing a pool
 *   - unpredictable: without the competition's secret key the sequence is
 *     not guessable
 *
 * Uniqueness across a purchase is therefore reduced to uniqueness of the
 * position counter (soldTickets), which is already assigned atomically.
 */

// Keyed round function → 32-bit pseudo-random value.
function prf(key, round, value) {
  return crypto
    .createHmac("sha256", key)
    .update(Buffer.from([round & 0xff]))
    .update(Buffer.from(String(value)))
    .digest()
    .readUInt32BE(0);
}

/**
 * @param {number} position      0-indexed slot in the sold order (0 … N-1)
 * @param {number} totalTickets  N — size of the number space
 * @param {string|Buffer} key    competition.shuffleKey (secret)
 * @returns {number} unique ticket number in [1, N] (1-based for humans — no ticket #0)
 */
function mapPositionToTicket(position, totalTickets, key) {
  const N = Number(totalTickets);

  if (!Number.isInteger(position) || position < 0 || position >= N) {
    throw new Error(`ticketNumber: position ${position} out of range [0, ${N})`);
  }
  if (N <= 1) return 1;

  // Even bit-width so the Feistel halves are equal size.
  let bits = Math.ceil(Math.log2(N));
  if (bits % 2 !== 0) bits += 1;
  const half = bits >> 1;
  const mask = (1 << half) - 1;
  const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(String(key));

  // Encrypt; cycle-walk (re-encrypt) until the result lands inside [0, N).
  // This keeps the mapping a bijection over the real range even when N is
  // not a power of two.
  let x = position;
  for (let guard = 0; guard < 10000; guard++) {
    let L = (x >>> half) & mask;
    let R = x & mask;
    for (let round = 0; round < 4; round++) {
      const f = prf(keyBuf, round, R) & mask;
      const nextL = R;
      const nextR = L ^ f;
      L = nextL;
      R = nextR;
    }
    x = ((L << half) | R) >>> 0;
    if (x < N) return x + 1; // shift to 1-based: tickets run 1..N, never #0
  }

  // Unreachable for realistic N; never hang.
  return position + 1;
}

module.exports = { mapPositionToTicket };
