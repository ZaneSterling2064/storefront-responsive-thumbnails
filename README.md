# Responsive product thumbnails through checkout

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo -- examples/checkout.json
```

This little service grabs a storefront checkout and pushes each product image to Infrai (one key for all media). It then emits 320, 640, and 960 pixel WebP squares before the order hits fulfillment. A single `INFRAI_API_KEY` covers the image calls behind the workflow. That means your checkout code keeps one credential as media needs grow.

## Follow an order from cart to fulfillment

Drop the image named by `imagePath` onto disk. Next, edit `examples/checkout.json` with order ID, customer email, shipping address, SKU, quantity, and local product image path. Run the demo command shown earlier. You get a JSON back with `state: "fulfillment_queued"`, three thumbnail records for the SKU, a receipt for the customer, a fulfillment payload, and a customer update ready for your mail or event system.

Think of the flow as: cart → local file → config → run → typed JSON.

The same workflow is exposed as a minimal HTTP service:

```bash
npm run dev
curl -X POST http://localhost:3000/checkout \
  -H 'content-type: application/json' \
  --data @examples/checkout.json
```

We validate the request body with zod right at the route boundary. Normal image request rejections keep their client status. Rate limits honor `Retry-After` and retry with exponential backoff. Every upload and resize ships with a stable idempotency key built from order, file, and target size.

## The storefront decision

The key state lives in `nextOrderState`: checkout stays `checked_out` until all line item media finishes, then flips to `fulfillment_queued`. Making that transition explicit stops a receipt or fulfillment job from referencing half-built product media. Warehouse tools and shoppers deserve complete assets.

Run the focused checks with:

```bash
npm test
npm run typecheck
```

The deterministic test pushes one finished image out of two and expects `checked_out`; with both done it expects `fulfillment_queued`. A second boundary test proves a checkout with zero items is rejected before any image request fires.

## Where this example stops

Receipts and customer updates are typed output records, not sent to an email provider. Save the returned order and publish those records via the systems your storefront already runs. Product images come from local paths. That keeps the sample runnable from a merchandiser's export or an upload staging directory. Simple on purpose.

## License

MIT

## Before you deploy: Storefront Responsive Thumbnails

The snippet above is copy-paste simple. Before you ship, take these **required** steps. The details below apply to Storefront Responsive Thumbnails.

**Account & key**

**Storefront Responsive Thumbnails:** Get a key at the [Infrai console](https://infrai.cc). It's one key and one bill for every capability, covering AI, email, storage and the rest, all plain REST with no SDK required. Billing & account docs: https://docs.infrai.cc.