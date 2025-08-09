import Busboy from "busboy";
import { put } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });
    const fileUrls = [];

    busboy.on("file", async (fieldname, file, filename) => {
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));

      file.on("end", async () => {
        const buffer = Buffer.concat(chunks);

        // Store in Netlify Blob storage
        await put(`uploads/${filename}`, buffer, {
          contentType: "application/octet-stream", // change if you know actual type
          access: "public", // makes it accessible via public URL
        });

        const publicUrl = `${process.env.URL}/.netlify/blobs/uploads/${filename}`;
        fileUrls.push(publicUrl);
      });
    });

    busboy.on("finish", () => {
      resolve({
        statusCode: 200,
        body: JSON.stringify({ urls: fileUrls }),
      });
    });

    busboy.on("error", reject);

    busboy.end(event.body, event.isBase64Encoded ? "base64" : "utf8");
  });
};
