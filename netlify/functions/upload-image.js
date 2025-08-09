const fs = require("fs");
const path = require("path");
const Busboy = require("busboy");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });

    const uploadsDir = path.join(__dirname, "../../public/uploads");

    // Ensure uploads dir exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let fileUrls = [];

    busboy.on("file", (fieldname, file, filename) => {
      const saveTo = path.join(uploadsDir, filename);
      const writeStream = fs.createWriteStream(saveTo);

      file.pipe(writeStream);

      writeStream.on("close", () => {
        // Return the public URL (relative to Netlify)
        const publicUrl = `/uploads/${filename}`;
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
