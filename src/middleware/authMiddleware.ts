import { type Request, type Response, type NextFunction } from 'express';
import { MoreThan } from 'typeorm';
import expressAsyncHandler from 'express-async-handler';

import { HttpStatus } from '../enums';
import { HttpException } from '../exceptions';
import { Session } from '../entities/Session';
import databaseClient from '../config/databaseClient';

export default expressAsyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.headers['x-session-id'];

  if (!sessionId) {
    console.warn(`Missing session ID for request: ${req.url}`);
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  if (typeof sessionId !== 'string') {
    console.warn(`Session ID is not a string: ${JSON.stringify(sessionId)}`);
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const sessionRepository = databaseClient.getRepository(Session);

  const session = await sessionRepository
    .createQueryBuilder('session')
    .leftJoinAndSelect('session.user', 'user')
    .leftJoinAndSelect('user.customerAccount', 'customerAccount')
    .leftJoinAndSelect('user.employeeAccount', 'employeeAccount')
    .leftJoinAndSelect('employeeAccount.role', 'role')
    .where('session.id = :id', { id: sessionId })
    .andWhere('session.expiresAt > :now', { now: new Date() })
    .getOne();

  if (!session) {
    console.warn('No valid session found');
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  if (!session.user.isActive) {
    throw new HttpException(HttpStatus.FORBIDDEN, 'Forbidden');
  }

  req.user = session.user;
  req.session = session;

  next();
});
