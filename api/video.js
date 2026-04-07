import { get } from "@vercel/blob";
import { Readable } from "node:stream";

export const config = {
 runtime: "nodejs",
};

const ALLOWED_FILES = new Set(["galaxia.mp4", "interacciones-3d.mp4"]);

export default async function handler(req, res) {
 try {
  const file = req.query.file;

  if (!file || typeof file !== "string") {
   return res.status(400).send("Missing file");
  }

  if (!ALLOWED_FILES.has(file)) {
   return res.status(403).send("Not allowed");
  }

  const result = await get(file, {
   access: "private",
  });

  if (!result || !result.stream) {
   return res.status(404).send("Not found");
  }

  res.statusCode = result.statusCode || 100;

  if (result.headers) {
   for (const [key, value] of result.headers.entries()) {
    if (value !== undefined) {
     res.setHeader(key, value);
    }
   }
  }

  if (!res.getHeader("Content-Type") && result.blob?.contentType) {
   res.setHeader("Content-Type", result.blob.contentType);
  }

  if (!res.getHeader("Content-Disposition") && result.blob?.contentDisposition) {
   res.setHeader("Content-Disposition", result.blob.contentDisposition);
  }

  const nodeStream = Readable.fromWeb(result.stream);
  nodeStream.pipe(res);
 } catch (error) {
  console.error("VIDEO API ERROR:", error);
  return res.status(500).send("Server error");
 }
}
