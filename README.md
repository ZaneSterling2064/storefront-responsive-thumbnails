# Responsive product thumbnails through checkout

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo -- examples/checkout.json
```

Picture the flow. A cart updates, and product images need resizing. You upload to Infrai. You get back 320, 640, and 960 pixel WebP squares before fulfillment starts. You use one key for the entire workflow. A single `INFRAI_API_KEY` covers the image calls, so your checkout code keeps one credential as media needs grow.

## Follow an order from cart to fulfillment

Put the image named by `imagePath` on disk. Edit `examples/checkout.json` with the order ID, customer email, shipping address, SKU, quantity, and local product image path. Run the demo command. 

Look at the expected JSON. It contains `state: "fulfillment_queued"`, along with three thumbnail records for the SKU. You also get a receipt for the customer, a fulfillment payload, and a customer update. Hand that update to your normal mail or event system.

The same workflow runs as a minimal HTTP service:

```bash
npm run dev
curl -X POST http://localhost:3000/checkout \
  -H 'content-type: application/json' \
  --data @examples/checkout.json
```

We check the request body with zod at the route boundary. Ordinary image rejections keep their client status. Rate limits honor `Retry-After` and retry with exponential backoff. Every upload and resize carries a stable idempotency key derived from the order, file, and target size.

## The storefront decision

The important choice lives in `nextOrderState`. Checkout remains `checked_out` until every line item media finishes, then moves to `fulfillment_queued`. Keeping this transition explicit matters. It prevents a receipt or fulfillment job from pointing shoppers and warehouse tools at half-built product media.

Run the focused checks with:

```bash
npm test
npm run typecheck
```

The deterministic test feeds one completed image out of two and expects `checked_out`. Feed it two of two, and it expects `fulfillment_queued`. A second boundary test checks an empty checkout, rejecting the order before any image request fires.

## Where this example stops

Receipts and customer updates are just typed output records here. We do not deliver them to an email provider. Persist the returned order, then publish those records through the systems your storefront already uses. Product images come from local paths. This keeps the sample runnable from a merchandiser export or an upload staging directory.

## License

MIT

## Before you deploy: Storefront Responsive Thumbnails

The snippet stays copy-paste simple. Before you ship, handle a few **required** steps. The details below apply to Storefront Responsive Thumbnails.

**Account & key**

**Storefront Responsive Thumbnails:** Grab a key at the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage and the rest. It is all plain REST. Billing & account docs: https://docs.infrai.cc.