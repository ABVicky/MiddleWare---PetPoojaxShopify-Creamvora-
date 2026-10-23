import { z } from "zod";

export const PetpoojaSaveOrderResponseSchema = z.object({
  success: z.union([z.string(), z.number()]).transform(String),
  message: z.string().default(""),
  restID: z.union([z.string(), z.number()]).transform(String).optional(),
  clientOrderID: z.union([z.string(), z.number()]).transform(String).optional(),
  orderID: z.union([z.string(), z.number()]).transform(String).optional(),
});

export const PetpoojaCallbackSchema = z.object({
  restID: z.union([z.string(), z.number()]).transform(String),
  orderID: z.union([z.string(), z.number()]).transform(String),
  clientOrderID: z.union([z.string(), z.number()]).transform(String).optional(),
  status: z.union([z.string(), z.number()]).transform(String),
  cancel_reason: z.string().optional(),
  minimum_prep_time: z.union([z.string(), z.number()]).transform(String).optional(),
  minimum_delivery_time: z.union([z.string(), z.number()]).transform(String).optional(),
  rider_name: z.string().optional(),
  rider_phone_number: z.string().optional(),
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
