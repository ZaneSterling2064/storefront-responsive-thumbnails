import { readFile } from "node:fs/promises";
import { checkoutOrder, checkoutSchema } from "../src/order_workflow.js";

const apiKey = process.env.INFRAI_API_KEY;
const requestFile = process.argv[2];
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the checkout.");
if (!requestFile) throw new Error("Pass a checkout JSON file as the first argument.");

const input = checkoutSchema.parse(JSON.parse(await readFile(requestFile, "utf8")));
const result = await checkoutOrder(input, apiKey);
console.log(JSON.stringify(result, null, 2));
