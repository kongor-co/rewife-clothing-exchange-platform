import { z } from "zod";
import { isAllowedGarmentSize } from "./garmentOptions";

export const categorySchema = z.enum(["TOP", "BOTTOM", "DRESS", "OUTERWEAR", "SHOES", "ACCESSORY", "OTHER"]);
export const conditionSchema = z.enum(["NEW", "VERY_GOOD", "GOOD"]);
export const fabricSchema = z.enum([
  "COTTON", "LINEN", "WOOL", "SILK", "HEMP", "VISCOSE", "LYOCELL", "MODAL",
  "POLYESTER", "POLYAMIDE", "ACRYLIC", "ELASTANE", "MIXED", "OTHER", "UNKNOWN",
]);

export const usernameSchema = z.string()
  .transform((value) => value.trim().normalize("NFKC"))
  .pipe(
    z.string()
      .min(2, "Use at least two characters for your username.")
      .max(50, "Use no more than 50 characters for your username.")
      .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value), "The username contains unsupported characters."),
  );

// Retained for older deployed clients while the username API rolls out.
export const displayNameSchema = usernameSchema;

export const itemInputSchema = z.object({
  title: z.string().trim().min(3).max(80),
  category: categorySchema,
  size: z.string().trim().min(1).max(20),
  condition: conditionSchema,
  mainFabric: fabricSchema,
  description: z.string().trim().max(500),
  compositionText: z.string().trim().max(150),
  imagePaths: z.array(z.string().min(1).max(300)).max(5),
}).strict().superRefine((item, context) => {
  if (!isAllowedGarmentSize(item.category, item.size)) {
    context.addIssue({
      code: "custom",
      path: ["size"],
      message: "Choose a size from the allowed EU size list for this category.",
    });
  }
});

export const itemIdSchema = z.object({ itemId: z.string().min(1).max(128) }).strict();
export const exchangeIdSchema = z.object({ exchangeId: z.string().min(1).max(128) }).strict();
export const operationIdSchema = z.string().uuid();

export function operationDocumentId(uid: string, operationId: string): string {
  return `${uid}_${operationId}`.replaceAll("/", "_");
}
