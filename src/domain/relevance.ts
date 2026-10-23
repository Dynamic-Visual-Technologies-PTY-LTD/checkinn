/**
 * Relevance (AD-26). For now only the vector step: every vector, from a
 * file, the database or the Provider, passes through `toUnitVector` so
 * similarity is a plain dot product.
 */

/**
 * Copies `values` into a fresh `Float32Array` scaled to unit length. Throws
 * on an empty, all-zero or non-finite vector, which has no direction.
 */
export function toUnitVector(values: ArrayLike<number>): Float32Array {
  const vector = Float32Array.from(values);
  let sumOfSquares = 0;
  for (const value of vector) sumOfSquares += value * value;
  const length = Math.sqrt(sumOfSquares);
  if (!Number.isFinite(length) || length === 0) {
    throw new Error("A vector must be non-empty, finite and not all zero.");
  }
  for (let i = 0; i < vector.length; i++) vector[i] /= length;
  return vector;
}
