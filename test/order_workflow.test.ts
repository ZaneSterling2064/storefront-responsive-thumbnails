import assert from "node:assert/strict";
import test from "node:test";
import { uploadAndResizeProductImage } from "../src/infrai_images.js";
import { checkoutSchema, nextOrderState } from "../src/order_workflow.js";

test("queues fulfillment only after every product image is ready", () => {
  assert.equal(nextOrderState(1, 2), "checked_out");
  assert.equal(nextOrderState(2, 2), "fulfillment_queued");
});

test("rejects a checkout without shippable items", () => {
  const parsed = checkoutSchema.safeParse({
    orderId: "order-1042",
    customerEmail: "buyer@example.com",
    shippingAddress: "12 Market Street",
    items: []
  });
  assert.equal(parsed.success, false);
});

test("sends resize settings through the image.process ops pipeline", async () => {
  const originalFetch = globalThis.fetch;
  const processBodies: FormData[] = [];
  globalThis.fetch = async (_input, init) => {
    const body = init?.body as FormData;
    if (body.has("ops")) processBodies.push(body);
    return new Response(JSON.stringify({ ok: true, data: {} }), {
      headers: { "content-type": "application/json" }
    });
  };

  try {
    await uploadAndResizeProductImage("test-key", "order-test", "examples/linen-shirt.ppm");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(processBodies.length, 3);
  for (const body of processBodies) {
    assert.deepEqual([...body.keys()].sort(), ["format", "image", "ops", "store"]);
    const ops = JSON.parse(String(body.get("ops")));
    assert.equal(ops[0].op, "resize");
    assert.equal(ops[0].params.fit, "cover");
    assert.equal(ops[0].params.enlarge, undefined);
  }
});
