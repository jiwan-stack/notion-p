import fs from "fs";
import path from "path";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: "File parse error" });
      return;
    }

    const file = files.file;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const newFilePath = path.join(uploadsDir, file.originalFilename);
    fs.copyFileSync(file.filepath, newFilePath);

    const publicUrl = `${process.env.URL}/uploads/${file.originalFilename}`;
    res.status(200).json({ imageUrl: publicUrl });
  });
};
