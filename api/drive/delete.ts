import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

function getServiceAccountCredentials() {
  const keyJson = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'];
  if (keyJson) {
    return JSON.parse(keyJson);
  }

  const keyPath = process.env['GOOGLE_SERVICE_ACCOUNT_KEY_PATH'];
  if (keyPath) {
    const resolvedPath = path.resolve(process.cwd(), keyPath);
    return JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  }

  throw new Error(
    'No service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_PATH.'
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileId } = req.query;

  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ error: 'fileId query parameter is required' });
  }

  try {
    const credentials = getServiceAccountCredentials();

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({ fileId });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Drive delete error:', error);
    return res.status(500).json({ error: 'Delete failed', details: String(error) });
  }
}
