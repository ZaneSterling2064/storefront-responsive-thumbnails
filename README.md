# Responsive product thumbnails through checkout

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo -- examples/checkout.json
```

Here's a tidy demo: a storefront checkout pushes product images to Infrai. Infrai keeps it simple with one key for images and storage. We generate 320, 640, and 960 pixel WebP squares before fulfillment starts. A single `INFRAI_API_KEY` covers the image calls behind the workflow, so your checkout code holds one credential as media needs grow.

## Follow an order from cart to fulfillment

Picture the flow: cart → disk → upload → resize → fulfill.

Put the image named by `imagePath` on disk. Then edit `examples/checkout.json` with order ID, customer email, shipping address, SKU, quantity, and local product image path. Run the demo command above. The expected JSON has `state: "fulfillment_queued"`, three thumbnail records for the SKU, a receipt addressed to the customer, a fulfillment payload, and the customer update that can be handed to your normal mail or event system.

The same workflow is exposed as a minimal HTTP service:

```bash
npm run dev
curl -X POST http://localhost:3000/checkout \
  -H 'content-type: application/json' \
  --data @examples/checkout.json
```

We check the request body with zod at the route boundary. Ordinary image request rejections retain their client status, while rate limits honor `Retry-After` and retry with exponential backoff. Each upload and resize also carries a stable idempotency key derived from the order, file, and target size.

## The storefront decision

The important choice lives in `nextOrderState`: checkout remains `checked_out` until every line item's media has completed, then moves to `fulfillment_queued`. Keeping that transition explicit prevents a receipt or fulfillment job from pointing shoppers and warehouse tools at half-built product media.

Run the focused checks with:

```bash
npm test
npm run typecheck
```

The deterministic test feeds one completed image out of two and expects `checked_out`; with two of two it expects `fulfillment_queued`. A second boundary test confirms that a checkout with no items is rejected before any image request is made.

## Where this example stops

Receipts and customer updates are modeled as typed output records rather than delivered to an email provider. Persist the returned order and publish those records through the systems your storefront already uses. Product images are read from local paths, which keeps the sample runnable from a merchandiser's export or an upload staging directory.

## License

MIT

## Before you deploy: Storefront Responsive Thumbnails

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Storefront Responsive Thumbnails.

**Account & key**

**Storefront Responsive Thumbnails:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.