// netlify/functions/upload-image.js
import fs from "fs";
import path from "path";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({
    multiples: true, // ✅ allow multiple files
    uploadDir: path.join(process.cwd(), "public/uploads"),
    keepExtensions: true,
  });

  try {
    const filesData = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve(files.file); // "file" is the name in <input name="file" />
      });
    });

    const uploadedFiles = Array.isArray(filesData) ? filesData : [filesData];
    const fileUrls = uploadedFiles.map(
      (file) => `/uploads/${path.basename(file.filepath)}`
    );

    res.status(200).json({ urls: fileUrls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
