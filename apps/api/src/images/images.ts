import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { memoryStorage } from 'multer';

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

/** Public URL prefix; files live in `<UPLOADS_DIR>/images` */
export const IMAGES_ROUTE = '/images';
export const IMAGES_DIR = join(UPLOADS_DIR, 'images');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Multer options shared by every image upload: kept in memory until permissions pass. */
export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
};

/** Checks the file's first bytes; the declared mimetype is whatever the client says. */
function detectExtension(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'jpg';
  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/**
 * Stores the upload under a new random name, so clients never see a stale cached picture,
 * and returns its public path, e.g. `/images/3f…-a1b2c3.jpg`.
 */
export async function saveImage(
  file: Express.Multer.File | undefined,
  ownerId: string,
) {
  if (!file)
    throw new BadRequestException('Missing "file" field with an image');
  const extension = detectExtension(file.buffer);
  if (!extension)
    throw new BadRequestException('Only JPEG, PNG or WebP images are allowed');
  await mkdir(IMAGES_DIR, { recursive: true });
  const filename = `${ownerId}-${randomBytes(6).toString('hex')}.${extension}`;
  await writeFile(join(IMAGES_DIR, filename), file.buffer);
  return `${IMAGES_ROUTE}/${filename}`;
}

/** Best effort: a leftover file only wastes disk space. */
export async function deleteImage(publicPath: string | null | undefined) {
  if (!publicPath?.startsWith(`${IMAGES_ROUTE}/`)) return;
  await unlink(join(IMAGES_DIR, basename(publicPath))).catch(() => undefined);
}

/** Club crests are shared with their tournament entries; only delete files nothing uses. */
export async function releaseImage(
  prisma: {
    club: { count: (args: { where: { crestUrl: string } }) => Promise<number> };
    team: { count: (args: { where: { crestUrl: string } }) => Promise<number> };
    tournament: {
      count: (args: { where: { imageUrl: string } }) => Promise<number>;
    };
  },
  publicPath: string | null | undefined,
) {
  if (!publicPath) return;
  const [clubs, teams, tournaments] = await Promise.all([
    prisma.club.count({ where: { crestUrl: publicPath } }),
    prisma.team.count({ where: { crestUrl: publicPath } }),
    prisma.tournament.count({ where: { imageUrl: publicPath } }),
  ]);
  if (clubs + teams + tournaments === 0) await deleteImage(publicPath);
}
