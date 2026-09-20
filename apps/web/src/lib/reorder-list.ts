/** A copy of `list` with the item at `index` moved by `by` places (-1 = earlier). Out of range: unchanged. */
export function reorder<T>(list: readonly T[], index: number, by: number): T[] {
  const target = index + by;
  const next = [...list];
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}
