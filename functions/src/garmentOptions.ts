const letterSizes = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const euClothingSizes = Array.from({ length: 20 }, (_, index) => `EU ${30 + index * 2}`);
const euShoeSizes = Array.from({ length: 33 }, (_, index) => {
  const size = 34 + index * 0.5;
  return `EU ${Number.isInteger(size) ? size.toFixed(0) : size.toFixed(1)}`;
});
const flexibleSizes = ["One size"];
const clothingSizes = [...letterSizes, ...euClothingSizes, ...flexibleSizes];

function uniqueOptions(options: string[]): string[] {
  return [...new Set(options)];
}

export const sizeOptionsByCategory = {
  TOP: clothingSizes,
  BOTTOM: clothingSizes,
  DRESS: clothingSizes,
  OUTERWEAR: clothingSizes,
  SHOES: [...euShoeSizes, ...flexibleSizes],
  ACCESSORY: [...letterSizes, ...flexibleSizes, "Not applicable"],
  OTHER: uniqueOptions([...letterSizes, ...euClothingSizes, ...euShoeSizes, ...flexibleSizes, "Not applicable"]),
} as const;

export function isAllowedGarmentSize(category: keyof typeof sizeOptionsByCategory, value: string): boolean {
  const options: readonly string[] = sizeOptionsByCategory[category];
  return options.includes(value);
}
