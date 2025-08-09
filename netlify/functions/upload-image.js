import Busboy from "busboy";

export async function handler(event) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });
    const files = [];

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const chunks = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        files.push({ filename, content: Buffer.concat(chunks), mimetype });
      });
    });

    busboy.on("finish", () => {
      resolve({
        statusCode: 200,
        body: JSON.stringify({ files }),
      });
    });

    busboy.end(Buffer.from(event.body, "base64"));
  });
}
