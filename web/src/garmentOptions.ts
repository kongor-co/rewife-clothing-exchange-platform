import type { Category } from "./types";

const letterSizes = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const euClothingSizes = Array.from({ length: 20 }, (_, index) => `EU ${30 + index * 2}`);
const euShoeSizes = Array.from({ length: 33 }, (_, index) => {
  const size = 34 + index * 0.5;
  return `EU ${Number.isInteger(size) ? size.toFixed(0) : size.toFixed(1)}`;
});
const flexibleSizes = ["One size"];
const accessorySizes = [...letterSizes, ...flexibleSizes, "Not applicable"];
const clothingSizes = [...letterSizes, ...euClothingSizes, ...flexibleSizes];

function uniqueOptions(options: string[]): string[] {
  return [...new Set(options)];
}

export const sizeOptionsByCategory: Record<Category, string[]> = {
  TOP: clothingSizes,
  BOTTOM: clothingSizes,
  DRESS: clothingSizes,
  OUTERWEAR: clothingSizes,
  SHOES: [...euShoeSizes, ...flexibleSizes],
  ACCESSORY: accessorySizes,
  OTHER: uniqueOptions([...letterSizes, ...euClothingSizes, ...euShoeSizes, ...flexibleSizes, "Not applicable"]),
};

export function filterSizeOptions(category: Category, query: string): string[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return sizeOptionsByCategory[category];
  }
  return sizeOptionsByCategory[category].filter((option) => option.toLocaleLowerCase().includes(normalizedQuery));
}

export function isAllowedGarmentSize(category: Category, value: string): boolean {
  return sizeOptionsByCategory[category].includes(value);
}
