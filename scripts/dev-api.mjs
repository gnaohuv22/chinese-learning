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

// POST /api/cloudinary/sign
app.post('/api/cloudinary/sign', (req, res) => {
  try {
    initCloudinary();

    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = {
      timestamp: timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      cloudinary.config().api_secret
    );

    return res.status(200).json({
      signature,
      timestamp,
      api_key: cloudinary.config().api_key,
      cloud_name: cloudinary.config().cloud_name,
    });
  } catch (error) {
    console.error('Cloudinary signature generation error:', error);
    return res.status(500).json({ error: 'Failed to generate signature', details: String(error) });
  }
});

// DELETE /api/cloudinary/delete?fileId=xxx
app.delete('/api/cloudinary/delete', async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });

  // Right now we'll just return true. Cloudinary deletion requires a public_id.
  // Full deletion would need parsing the public_id from secure_url.
  return res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[dev-api] Listening on http://localhost:${PORT}`);
});
