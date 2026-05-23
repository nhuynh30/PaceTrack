import { Router, Request, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const s3 = new S3Client({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? '',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? '',
  },
});

const BUCKET = process.env['S3_BUCKET'] ?? '';

// POST /api/v1/upload/gpx
// Returns a presigned PUT URL the client uses to upload directly to S3.
router.post('/gpx', async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const key = `gpx/${userId}/${Date.now()}.gpx`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: 'application/gpx+xml',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const fileUrl = `https://${BUCKET}.s3.${process.env['AWS_REGION']}.amazonaws.com/${key}`;

  res.json({ uploadUrl, fileUrl });
});

export default router;
