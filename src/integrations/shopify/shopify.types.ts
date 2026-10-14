import { z } from "zod";

export const ShopifyPriceSetSchema = z.object({
  shop_money: z.object({
    amount: z.string(),
    currency_code: z.string(),
  }).optional(),
});

export const ShopifyTaxLineSchema = z.object({
  title: z.string(),
  price: z.string(),
  rate: z.number().optional(),
  channel_liable: z.boolean().optional(),
});

export const ShopifyDiscountAllocationSchema = z.object({
  amount: z.string(),
  discount_application_index: z.number().optional(),
});

export const ShopifyLineItemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  product_id: z.union([z.number(), z.string()]).nullable().optional(),
  variant_id: z.union([z.number(), z.string()]).nullable().optional(),
  title: z.string(),
  variant_title: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  quantity: z.number(),
  price: z.string(),
  total_discount: z.string().optional().default("0.00"),
  discount_allocations: z.array(ShopifyDiscountAllocationSchema).optional().default([]),
  tax_lines: z.array(ShopifyTaxLineSchema).optional().default([]),
  requires_shipping: z.boolean().optional(),
  taxable: z.boolean().optional(),
  name: z.string().optional(),
});

export const ShopifyAddressSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address1: z.string().nullable().optional(),
  address2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const ShopifyCustomerSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  email: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  default_address: ShopifyAddressSchema.optional(),
});

export const ShopifyShippingLineSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  title: z.string().optional(),
  price: z.string(),
  discounted_price: z.string().optional(),
  tax_lines: z.array(ShopifyTaxLineSchema).optional().default([]),
});

export const ShopifyOrderWebhookSchema = z.object({
  id: z.union([z.number(), z.string()]),
  admin_graphql_api_id: z.string().optional(),
  name: z.string(), // e.g. "#1001"
  order_number: z.union([z.number(), z.string()]),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  cancelled_at: z.string().nullable().optional(),
  cancel_reason: z.string().nullable().optional(),
  financial_status: z.enum([
    "pending",
    "authorized",
    "partially_paid",
    "paid",
    "partially_refunded",
    "refunded",
    "voided",
  ]),
  fulfillment_status: z.string().nullable().optional(),
  currency: z.string().default("INR"),
  total_price: z.string(),
  subtotal_price: z.string(),
  total_tax: z.string().default("0.00"),
  total_discounts: z.string().default("0.00"),
  total_shipping_price_set: ShopifyPriceSetSchema.optional(),
  shipping_lines: z.array(ShopifyShippingLineSchema).optional().default([]),
  payment_gateway_names: z.array(z.string()).optional().default([]),
  note: z.string().nullable().optional(),
  customer: ShopifyCustomerSchema.nullable().optional(),
  shipping_address: ShopifyAddressSchema.nullable().optional(),
  billing_address: ShopifyAddressSchema.nullable().optional(),
  line_items: z.array(ShopifyLineItemSchema),
  test: z.boolean().optional().default(false),
});

export type ShopifyOrderWebhook = z.infer<typeof ShopifyOrderWebhookSchema>;
export type ShopifyLineItem = z.infer<typeof ShopifyLineItemSchema>;
