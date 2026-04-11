import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

function parseForm(
  req: VercelRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 100 * 1024 * 1024 });
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
    const credentials = getServiceAccountCredentials();
    const folderId = process.env['GOOGLE_DRIVE_FOLDER_ID'];

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const { fields, files } = await parseForm(req);

    const fileField = files['file'];
    const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filenameField = fields['filename'];
    const mimeTypeField = fields['mimeType'];
    const filename = Array.isArray(filenameField)
      ? filenameField[0]
      : filenameField ?? uploadedFile.originalFilename ?? 'upload';
    const mimeType = Array.isArray(mimeTypeField)
      ? mimeTypeField[0]
      : mimeTypeField ?? uploadedFile.mimetype ?? 'application/octet-stream';

    const fileStream = fs.createReadStream(uploadedFile.filepath);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: filename,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType,
        body: fileStream,
      },
      fields: 'id,name',
    });

    const fileId = driveResponse.data.id!;

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
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
}
