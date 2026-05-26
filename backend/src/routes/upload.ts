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

// POST /api/v1/upload/gpx/parse
// Accepts raw GPX XML in the request body (text/xml or application/gpx+xml).
// Returns parsed GPS fields: coordinatesCount, routeGeoJSON, elevationGainM, distanceKm.
router.post('/gpx/parse', async (req: Request, res: Response) => {
  const gpxText: string =
    typeof req.body === 'string'
      ? req.body
      : (req.body as { gpx?: string })?.gpx ?? '';

  if (!gpxText) {
    res.status(400).json({ error: 'GPX content is required in the request body' });
    return;
  }

  // Parse <trkpt> elements using lightweight regex — avoids a full XML parser dep.
  // GPX trkpt format: <trkpt lat="..." lon="..."><ele>...</ele>...</trkpt>
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>[\s\S]*?(?:<ele>([\d.+-]+)<\/ele>)?[\s\S]*?<\/trkpt>/g;
  const coords: [number, number][] = []; // [lng, lat] — GeoJSON order
  const elevations: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = trkptRegex.exec(gpxText)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const ele = match[3] !== undefined ? parseFloat(match[3]) : null;
    if (!isNaN(lat) && !isNaN(lng)) {
      coords.push([lng, lat]);
      elevations.push(ele ?? 0);
    }
  }

  if (coords.length < 2) {
    res.status(422).json({ error: 'GPX file must contain at least 2 track points' });
    return;
  }

  // Compute elevation gain (sum of positive climbs)
  let elevationGainM = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) elevationGainM += diff;
  }

  // Compute distance using haversine
  const EARTH_RADIUS_KM = 6371;
  function toRad(deg: number) { return (deg * Math.PI) / 180; }
  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  let distanceKm = 0;
  for (let i = 1; i < coords.length; i++) {
    // coords are [lng, lat]
    distanceKm += haversineKm(coords[i-1][1], coords[i-1][0], coords[i][1], coords[i][0]);
  }

  res.json({
    coordinatesCount: coords.length,
    elevationGainM: Math.round(elevationGainM * 10) / 10,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    routeGeoJSON: {
      type: 'LineString',
      coordinates: coords,
    },
  });
});

export default router;
