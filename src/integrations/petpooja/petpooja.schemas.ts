import { z } from "zod";

export const PetpoojaSaveOrderResponseSchema = z.object({
  success: z.string(),
  message: z.string(),
  restID: z.string().optional(),
  clientOrderID: z.string().optional(),
  orderID: z.string().optional(),
});

export const PetpoojaCallbackSchema = z.object({
  restID: z.string(),
  orderID: z.string(),
  clientOrderID: z.string().optional(),
  status: z.string(),
  cancel_reason: z.string().optional(),
  minimum_prep_time: z.string().optional(),
});

export const PetpoojaStoreStatusSchema = z.object({
  restID: z.string(),
  store_status: z.enum(["0", "1"]),
  turn_on_time: z.string().optional(),
  reason: z.string().optional(),
});

export const PetpoojaItemStockSchema = z.object({
  restID: z.string(),
  type: z.string().default("item"),
  inStock: z.boolean(),
  itemID: z.array(z.string()),
  autoTurnOnTime: z.string().optional(),
});
