import createSlug from 'slugify';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { Request } from 'express';

import { HttpStatus } from '../enums';
import { HttpException } from '../exceptions';

export function slugify(str: string) {
  return createSlug(str, { lower: true, trim: true });
}

export const formatSuccessResponse = (message: string, payload?: any, meta: object = {}) => ({
  success: true,
  message,
  payload,
});

export const formatErrorResponse = (message: string, code = HttpStatus.INTERNAL_SERVER_ERROR, errors?: any) => ({
  success: false,
  message,
  errors,
  code,
});

export const normalizePhoneNumber = (raw: string): string => {
  try {
    // Remove all spaces and non-digit characters except '+' (e.g., "+256 782 346200" => "+256782346200")
    const cleaned = raw.replace(/[^\d+]/g, '');

    const phoneNumber = parsePhoneNumberWithError(cleaned, 'UG');
    if (!phoneNumber.isValid()) {
      throw new Error('Invalid phone number');
    }
    return phoneNumber.number;
  } catch (error) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'Invalid phone number format');
  }
};

/**
 * Safely get files for a specific field from req.files
 */
export function getFiles(req: Request, field: string): Express.Multer.File[] {
  const files = req.files;

  if (!files) return [];

  // Case 1: upload.array("field")
  if (Array.isArray(files)) {
    return files;
  }

  // Case 2: upload.fields([{ name: "field" }])
  if (typeof files === 'object' && field in files) {
    return files[field] || [];
  }

  return [];
}

/**
 * Safely get a single file (first one) from req.files
 */
export function getSingleFile(req: Request, field: string): Express.Multer.File | undefined {
  return getFiles(req, field)[0];
}
