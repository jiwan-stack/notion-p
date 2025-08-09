import Busboy from "busboy";
import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });
    const fileUrls = [];

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));

      file.on("end", async () => {
        const buffer = Buffer.concat(chunks);

        // Create or get the "uploads" store
        const store = getStore("uploads");

        // Store file publicly
        await store.set(filename, buffer, {
          contentType: mimetype,
          access: "public",
        });

        // Construct public URL
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
