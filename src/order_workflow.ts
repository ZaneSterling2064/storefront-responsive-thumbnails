import { z } from "zod";
import { InfraiError, uploadAndResizeProductImage } from "./infrai_images.js";

export const checkoutSchema = z.object({
  orderId: z.string().min(1),
  customerEmail: z.string().email(),
  shippingAddress: z.string().min(8),
  items: z.array(z.object({
    sku: z.string().min(1),
    quantity: z.number().int().positive(),
    imagePath: z.string().min(1)
  })).min(1)
});

export type CheckoutRequest = z.infer<typeof checkoutSchema>;
export type OrderState = "checked_out" | "media_ready" | "fulfillment_queued";

export interface OrderUpdate {
  type: "customer_update";
  recipient: string;
  message: string;
}

export interface CheckoutResult {
  orderId: string;
  state: OrderState;
  receipt: { recipient: string; itemCount: number };
  fulfillment: { shippingAddress: string; skus: string[] };
  customerUpdate: OrderUpdate;
  media: Array<{ sku: string; upload: unknown; thumbnails: unknown[] }>;
}

export function nextOrderState(completedMedia: number, expectedMedia: number): OrderState {
  if (completedMedia !== expectedMedia || expectedMedia === 0) return "checked_out";
  return "fulfillment_queued";
}

export async function checkoutOrder(
  input: CheckoutRequest,
  apiKey: string
): Promise<CheckoutResult> {
  const media = await Promise.all(input.items.map(async (item) => {
    const result = await uploadAndResizeProductImage(apiKey, input.orderId, item.imagePath);
    return { sku: item.sku, upload: result.upload, thumbnails: result.thumbnails };
  }));
  const state = nextOrderState(media.length, input.items.length);
  const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    orderId: input.orderId,
    state,
    receipt: { recipient: input.customerEmail, itemCount },
    fulfillment: {
      shippingAddress: input.shippingAddress,
      skus: input.items.flatMap((item) => Array(item.quantity).fill(item.sku))
    },
    customerUpdate: {
      type: "customer_update",
      recipient: input.customerEmail,
      message: `Order ${input.orderId} is queued for fulfillment with responsive product media.`
    },
    media
  };
}

export function statusForError(error: unknown): number {
  if (error instanceof z.ZodError) return 400;
  if (error instanceof InfraiError && error.status >= 400 && error.status < 500) return error.status;
  return 500;
}
