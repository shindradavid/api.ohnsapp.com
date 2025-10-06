import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { formatErrorResponse } from '../utils';
import { HttpStatus } from '../enums';
import { HttpException } from '../exceptions';

export default (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error: ', err);

  if (err instanceof HttpException) {
    res.status(err.status).send(formatErrorResponse(err.message, err.status));
  } else if (err instanceof ZodError) {
    const formatted = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(HttpStatus.BAD_REQUEST).json(formatErrorResponse('Validation failed', HttpStatus.BAD_REQUEST, formatted));
  } else {
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(formatErrorResponse('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR));
  }
};
