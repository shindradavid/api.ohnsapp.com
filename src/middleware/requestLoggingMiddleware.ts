import { Request, Response, NextFunction } from 'express';

export default (req: Request, res: Response, next: NextFunction) => {
  const requestStartTime = Date.now();

  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - requestStartTime;
    const timestamp = new Date().toISOString();
    const statusCode = res.statusCode;

    console.log(`${timestamp}: ${method.toUpperCase()} ${originalUrl} - ${statusCode} in ${duration}ms`);
  });

  next();
};
