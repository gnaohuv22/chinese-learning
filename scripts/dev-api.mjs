/**
 * Local development API server
 * Run with: node scripts/dev-api.mjs
 * Listens on http://localhost:3100
 */

import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3100;

function initCloudinary() {
  const url = process.env.CLOUDINARY_URL;
  if (url) {
    cloudinary.config(true);
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

// POST /api/drive/upload
app.post('/api/drive/upload', (req, res) => {
  const form = formidable({ maxFileSize: 250 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Form parse error', details: String(err) });

    try {
      initCloudinary();

      const fileField = files['file'];
      const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;
      if (!uploadedFile) return res.status(400).json({ error: 'No file provided' });

      const uploadRes = await cloudinary.uploader.upload(uploadedFile.filepath, {
        resource_type: 'auto',
      });

      fs.unlinkSync(uploadedFile.filepath);

      return res.status(200).json({
        fileId: uploadRes.secure_url,
        embedUrl: uploadRes.secure_url,
        thumbnailUrl: uploadRes.secure_url.replace(/\.[^/.]+$/, '.jpg'),
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return res.status(500).json({ error: 'Upload failed', details: String(error) });
    }
  });
});

// DELETE /api/drive/delete?fileId=xxx
app.delete('/api/drive/delete', async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });

  // Right now we'll just return true. Cloudinary deletion requires a public_id.
  // Full deletion would need parsing the public_id from secure_url.
  return res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[dev-api] Listening on http://localhost:${PORT}`);
});
