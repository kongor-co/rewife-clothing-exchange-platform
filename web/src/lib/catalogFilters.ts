export function formatActiveFilterSummary(groups: ReadonlyArray<readonly string[]>): string {
  return groups
    .filter((values) => values.length > 0)
    .map((values) => values.join(", ").toLocaleLowerCase())
    .join(" - ");
}
