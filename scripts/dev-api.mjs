/**
 * Local development API server — mirrors the Vercel serverless functions in /api/.
 * Run with: node scripts/dev-api.mjs
 * Listens on http://localhost:3100
 */

import express from 'express';
import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3100;

function getServiceAccountCredentials() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) return JSON.parse(keyJson);

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath) {
    const resolved = path.resolve(process.cwd(), keyPath);
    return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  }
  throw new Error(
    'Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_PATH in .env'
  );
}

// POST /api/drive/upload
app.post('/api/drive/upload', (req, res) => {
  const form = formidable({ maxFileSize: 100 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Form parse error', details: String(err) });

    try {
      const credentials = getServiceAccountCredentials();
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      const drive = google.drive({ version: 'v3', auth });

      const fileField = files['file'];
      const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;
      if (!uploadedFile) return res.status(400).json({ error: 'No file provided' });

      const filenameField = fields['filename'];
      const mimeTypeField = fields['mimeType'];
      const filename = (Array.isArray(filenameField) ? filenameField[0] : filenameField) ?? uploadedFile.originalFilename ?? 'upload';
      const mimeType = (Array.isArray(mimeTypeField) ? mimeTypeField[0] : mimeTypeField) ?? uploadedFile.mimetype ?? 'application/octet-stream';

      const fileStream = fs.createReadStream(uploadedFile.filepath);
      const driveResponse = await drive.files.create({
        requestBody: { name: filename, parents: folderId ? [folderId] : undefined },
        media: { mimeType, body: fileStream },
        fields: 'id,name',
      });

      const fileId = driveResponse.data.id;
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      fs.unlinkSync(uploadedFile.filepath);

      return res.status(200).json({
        fileId,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}`,
      });
    } catch (error) {
      console.error('Drive upload error:', error);
      return res.status(500).json({ error: 'Upload failed', details: String(error) });
    }
  });
});

// DELETE /api/drive/delete?fileId=xxx
app.delete('/api/drive/delete', async (req, res) => {
  const fileId = req.query.fileId;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });

  try {
    const credentials = getServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Drive delete error:', error);
    return res.status(500).json({ error: 'Delete failed', details: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`[dev-api] Listening on http://localhost:${PORT}`);
});
