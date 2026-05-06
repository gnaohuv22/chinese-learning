import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

function initCloudinary() {
  const url = process.env['CLOUDINARY_URL'];
  if (url) {
    // Cloudinary automatically picks up CLOUDINARY_URL from env, but we can call config to be safe
    cloudinary.config(true);
  } else {
    // Fallback if they provided separate keys
    cloudinary.config({
      cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
      api_key: process.env['CLOUDINARY_API_KEY'],
      api_secret: process.env['CLOUDINARY_API_SECRET'],
    });
  }
}

function parseForm(
  req: VercelRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 250 * 1024 * 1024 }); // 250MB limit
    form.parse(req as unknown as Parameters<typeof form.parse>[0], (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    initCloudinary();

    const { files } = await parseForm(req);
    const fileField = files['file'];
    const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Determine resource_type based on mimetype
    // Cloudinary 'auto' handles almost everything automatically
    const uploadRes = await cloudinary.uploader.upload(uploadedFile.filepath, {
      resource_type: 'auto',
    });

    fs.unlinkSync(uploadedFile.filepath);

    // Replace the fileId/embedUrl logic with direct secure_url
    return res.status(200).json({
      fileId: uploadRes.secure_url,
      embedUrl: uploadRes.secure_url,
      thumbnailUrl: uploadRes.secure_url.replace(/\.[^/.]+$/, '.jpg'), // basic thumbnail extension replacement (works if it's a video)
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({ error: 'Upload failed', details: String(error) });
  }
}
