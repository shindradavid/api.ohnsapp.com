import { v4 as uuidV4 } from 'uuid';
import sharp from 'sharp';

import { S3Client, PutObjectCommand, S3ServiceException } from '@aws-sdk/client-s3';
import { HttpStatus } from '../enums';
import { HttpException } from '../exceptions';
import envHelper from '../helpers/envHelper';

const bucketName = envHelper.S3_STORAGE_BUCKET_NAME;
const storageBucketEndpoint = envHelper.S3_STORAGE_BUCKET_ENDPOINT;
const s3Client = new S3Client({
  forcePathStyle: true,
  endpoint: envHelper.S3_STORAGE_ENDPOINT,
  region: envHelper.S3_STORAGE_REGION,
  credentials: {
    accessKeyId: envHelper.S3_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: envHelper.S3_STORAGE_SECRET_ACCESS_KEY,
  },
});

const compressImage = async (buffer: Buffer<ArrayBufferLike>) => {
  const compressedBuffer = await sharp(buffer).toFormat('png', { quality: 60 }).toBuffer();
  return compressedBuffer;
};

/**
 * Uploads a image file to S3.
 * @param file - The file to upload to the S3 bucket.
 * @param folder - The folder in which to store the file.
 * @returns URL - Public URL for the uploaded object
 */
export const uploadImageFile = async (file: Express.Multer.File, folder: string): Promise<string> => {
  try {
    const compressedImage = await compressImage(file.buffer); // images transformed to webp
    const fileKey = `${folder}/${uuidV4()}.png`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: compressedImage,
      ACL: 'public-read',
      ContentType: 'image/png',
    });

    await s3Client.send(command);
    console.log('Successfully uploaded object to s3');

    return `${storageBucketEndpoint}/${fileKey}`;
  } catch (err) {
    console.error(`S3 Upload Error: ${JSON.stringify(err, null, 2)}`);

    if (err instanceof S3ServiceException) {
      console.error('S3 Service Exception:', err.name, err.message);

      switch (err.name) {
        case 'AccessDenied':
          console.log('Access Denied: Access to s3 storage denied');
          throw new HttpException(HttpStatus.INTERNAL_SERVER_ERROR, 'File upload failed.');
        case 'NoSuchBucket':
          console.log('NoSuchBucket: The specified bucket does not exist.');
          throw new HttpException(HttpStatus.INTERNAL_SERVER_ERROR, 'File upload failed.');
        case 'NetworkingError':
          console.log('NetworkingError: A network error occurred. Check your connection.');
          throw new HttpException(HttpStatus.INTERNAL_SERVER_ERROR, 'File upload failed.');
        case 'EntityTooLarge':
          console.log('EntityTooLarge: File is too large. Use multipart uploads for large files..');
          throw new HttpException(HttpStatus.BAD_REQUEST, 'File is too large');
        default:
          console.log(`Unknown Error: ${err.message || 'No message available'}`);
          throw new HttpException(HttpStatus.INTERNAL_SERVER_ERROR, 'File upload failed.');
      }
    } else {
      console.log('Unknown Error');
      throw new HttpException(HttpStatus.INTERNAL_SERVER_ERROR, 'File upload failed.');
    }
  }
};

export default {
  uploadImageFile,
};
