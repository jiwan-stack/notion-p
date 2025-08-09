import Busboy from "busboy";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send({ error: "Method not allowed" });
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }

  const files = [];

  const busboy = Busboy({ headers: req.headers });

  busboy.on("file", (fieldname, file, filename) => {
    const savePath = path.join(uploadsDir, filename);
    const writeStream = fs.createWriteStream(savePath);
    file.pipe(writeStream);
    files.push(filename);
  });

  busboy.on("finish", () => {
    res.status(200).json({ message: "Files uploaded", files });
  });

  req.pipe(busboy);
}
