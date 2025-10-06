import { z } from 'zod';
import { type Request, type Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { UAParser } from 'ua-parser-js';

import databaseClient from '../config/databaseClient';
import authService from '../services/authService';
import { User } from '../entities/User';
import { HttpStatus } from '../enums';
import { formatSuccessResponse } from '../utils';
import { Session } from '../entities/Session';
import { HttpException } from '../exceptions';
import { auditService } from '../services/auditService';

const handleEmployeeLogin = expressAsyncHandler(async (req: Request, res: Response) => {
  const loginDataSchema = z.object({
    email: z.email().trim(),
    password: z.string().min(8).trim(),
  });

  const { email, password } = loginDataSchema.parse(req.body);

  const user = await databaseClient
    .getRepository(User)
    .createQueryBuilder('user')
    .where('user.email = :email', { email })
    .leftJoinAndSelect('user.employeeAccount', 'employeeAccount')
    .getOne();

  if (!user || !user.employeeAccount) {
    await auditService.logAction({
      performedBy: null,
      actionDescription: `Unauthorized login attempt for email ${email}`,
      affectedResourceId: null,
      affectedResourceType: null,
    });

    throw new HttpException(HttpStatus.BAD_REQUEST, 'Invalid email or password');
  }

  const isMatch = await authService.comparePassword(password, user.hashedPassword);

  if (!isMatch) {
    await auditService.logAction({
      performedBy: null,
      actionDescription: `Invalid login attempt for email ${email}`,
      affectedResourceId: null,
      affectedResourceType: null,
    });

    throw new HttpException(HttpStatus.BAD_REQUEST, 'Invalid email or password');
  }

  const userAgent = req.headers['user-agent'] ?? null;

  const session = await authService.createSession(user, userAgent);

  await auditService.logAction({
    performedBy: user.employeeAccount,
    actionDescription: `${user.name} logged into the dashboard`,
    affectedResourceId: session.id,
    affectedResourceType: 'Session',
  });

  res.status(HttpStatus.OK).send(
    formatSuccessResponse('Login successful', {
      sessionId: session.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt,
      },
    }),
  );
});

const handleEmployeeAuthentication = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser || !authUser.employeeAccount) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  res.status(HttpStatus.OK).send(
    formatSuccessResponse('Login successful', {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      phoneNumber: authUser.phoneNumber,
      photoUrl: authUser.photoUrl,
      createdAt: authUser.createdAt,
    }),
  );
});

const handleGetUserSessions = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;
  const currentSessionId = req.session?.id;

  if (!authUser || !currentSessionId) {
    throw new HttpException(HttpStatus.FORBIDDEN, 'Forbidden');
  }

  const sessions = await Session.find({
    where: { user: authUser },
    order: { createdAt: 'DESC' },
  });

  const parsedSessions = sessions.map((session) => {
    const parser = new UAParser(session.userAgent || '');
    const result = parser.getResult();

    const os = `${result.os.name ?? 'Unknown'} ${result.os.version ?? ''}`.trim();
    const browser = result.browser.name ?? 'Unknown';
    const deviceType = result.device.type === 'mobile' ? 'mobile' : 'desktop';

    return {
      os,
      browser,
      deviceType,
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === currentSessionId,
    };
  });

  res.status(HttpStatus.OK).send(formatSuccessResponse('Success', parsedSessions));
});

const handleDeleteSession = expressAsyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new HttpException(HttpStatus.FORBIDDEN, 'Forbidden');
  }

  const { sessionId } = req.params;

  const session = await Session.findOne({ where: { id: sessionId, user } });

  if (!session) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Session not found');
  }

  await Session.remove(session);

  res.status(200).send({ success: true, message: 'Session terminated' });
});

const handleLogout = expressAsyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  const currentSessionId = req.session?.id;

  if (!user || !currentSessionId) {
    throw new HttpException(HttpStatus.FORBIDDEN, 'Forbidden');
  }

  const session = await Session.findOne({
    where: { id: currentSessionId, user },
  });

  if (!session) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Session not found');
  }

  await Session.remove(session);

  await auditService.logAction({
    performedBy: user.employeeAccount,
    actionDescription: `${user.name} logged out of the dashboard`,
    affectedResourceId: session.id,
    affectedResourceType: 'Session',
  });

  res.status(HttpStatus.NO_CONTENT).send(formatSuccessResponse('Logged out successfully', null));
});

export default {
  handleEmployeeLogin,
  handleEmployeeAuthentication,
  handleGetUserSessions,
  handleDeleteSession,
  handleLogout,
};
