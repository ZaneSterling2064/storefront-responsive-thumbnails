import { createServer } from "node:http";
import { checkoutOrder, checkoutSchema, statusForError } from "./order_workflow.js";

const port = Number(process.env.PORT ?? 3000);
const apiKey = process.env.INFRAI_API_KEY;

if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the checkout service.");

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json");
  if (request.method !== "POST" || request.url !== "/checkout") {
    response.writeHead(404).end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const input = checkoutSchema.parse(await readJson(request));
    const result = await checkoutOrder(input, apiKey);
    response.writeHead(201).end(JSON.stringify(result));
  } catch (error) {
    const status = statusForError(error);
    const message = error instanceof Error ? error.message : "Request failed";
    response.writeHead(status).end(JSON.stringify({ error: message }));
  }
});

server.listen(port, () => console.log(`Checkout service listening on http://localhost:${port}`));
