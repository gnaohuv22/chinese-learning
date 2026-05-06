import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

function initCloudinary() {
  const url = process.env['CLOUDINARY_URL'];
  if (url) {
    cloudinary.config(true);
  } else {
    cloudinary.config({
      cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
      api_key: process.env['CLOUDINARY_API_KEY'],
      api_secret: process.env['CLOUDINARY_API_SECRET'],
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    initCloudinary();

    const timestamp = Math.round(new Date().getTime() / 1000);

    // Any parameters we want to include in the signature must be passed here
    // Currently, we don't need any special parameters, just the timestamp.
    // If we wanted to enforce a specific folder or eager transformation, we'd add it.
    const paramsToSign = {
      timestamp: timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      cloudinary.config().api_secret!
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
}
