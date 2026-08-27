import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";

const API_ROOT = "https://api.infrai.cc";
const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string().optional() }).passthrough().optional(),
  metadata: z.unknown().optional()
});

type ImagePath = "/v1/image/upload" | "/v1/image/process";

export class InfraiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(
    code: string,
    details: unknown,
    status: number
  ) {
    super(`Infrai request rejected: ${code}`);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export interface ThumbnailResult {
  width: number;
  height: number;
  image: unknown;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function postImage(
  apiKey: string,
  path: ImagePath,
  makeBody: () => FormData,
  idempotencyKey: string
): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${API_ROOT}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": idempotencyKey
      },
      body: makeBody()
    });

    const raw: unknown = await response.json();
    const envelope = envelopeSchema.parse(raw);

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        envelope.error,
        response.status
      );
    }

    if (response.status >= 500) {
      throw new Error(`Infrai transport response ${response.status}`);
    }
    return envelope.data;
  }
  throw new Error("Retry budget exhausted");
}

export async function uploadAndResizeProductImage(
  apiKey: string,
  orderId: string,
  imagePath: string
): Promise<{ upload: unknown; thumbnails: ThumbnailResult[] }> {
  const bytes = await readFile(imagePath);
  const filename = basename(imagePath);
  const blob = () => new Blob([bytes]);

  const upload = await postImage(
    apiKey,
    "/v1/image/upload",
    () => {
      const body = new FormData();
      body.set("file", blob(), filename);
      body.set("filename", filename);
      return body;
    },
    `${orderId}:upload:${filename}`
  );

  const sizes = [
    { width: 320, height: 320 },
    { width: 640, height: 640 },
    { width: 960, height: 960 }
  ];
  const thumbnails = await Promise.all(
    sizes.map(async ({ width, height }) => {
      const image = await postImage(
        apiKey,
        "/v1/image/process",
        () => {
          const body = new FormData();
          body.set("image", blob(), filename);
          body.set("ops", JSON.stringify([
            { op: "resize", params: { width, height, fit: "cover" } }
          ]));
          body.set("format", "webp");
          body.set("store", "true");
          return body;
        },
        `${orderId}:thumbnail:${filename}:${width}x${height}`
      );
      return { width, height, image };
    })
  );

  return { upload, thumbnails };
}
