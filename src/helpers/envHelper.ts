import z from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), {
      message: 'PORT must be a valid number',
    }),
  HOST: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), {
      message: 'PORT must be a valid number',
    }),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  S3_STORAGE_ENDPOINT: z.string(),
  S3_STORAGE_REGION: z.string(),
  S3_STORAGE_ACCESS_KEY_ID: z.string(),
  S3_STORAGE_SECRET_ACCESS_KEY: z.string(),
  S3_STORAGE_BUCKET_NAME: z.string(),
  S3_STORAGE_BUCKET_ENDPOINT: z.string(),
  MAIL_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), {
      message: 'MAIL_PORT must be a valid number',
    }),
  MAIL_HOST: z.string(),
  MAIL_USER: z.string(),
  MAIL_PASSWORD: z.string(),
  COMPANY_TOKEN: z.string(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:\n', parsedEnv.error.format());
  throw new Error('Invalid environment variables');
}

export default parsedEnv.data;
