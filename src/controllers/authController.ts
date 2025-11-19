import { z } from 'zod';
import { type Request, type Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { UAParser } from 'ua-parser-js';

import databaseClient from '../config/databaseClient';
import authService from '../services/authService';
import { User } from '../entities/User';
import { HttpStatus } from '../enums';
import { formatSuccessResponse, normalizePhoneNumber } from '../utils';
import { Session } from '../entities/Session';
import { HttpException } from '../exceptions';
import { auditService } from '../services/auditService';
import { Customer } from '../entities/Customer';

const handleEmployeeLogin = expressAsyncHandler(async (req: Request, res: Response) => {
  const loginDataSchema = z.object({
    phoneNumber: z
      .string()
      .trim()
      .transform((val, ctx) => {
        try {
          return normalizePhoneNumber(val); // normalize and return E.164 format
        } catch (err) {
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid phone number format',
          });
          return z.NEVER; // stop transformation on failure
        }
      }),
    password: z.string().min(8).trim(),
  });

  const { phoneNumber, password } = loginDataSchema.parse(req.body);

  const user = await databaseClient
    .getRepository(User)
    .createQueryBuilder('user')
    .where('user.phone_number = :phoneNumber', { phoneNumber })
    .leftJoinAndSelect('user.employeeAccount', 'employeeAccount')
    .getOne();

  if (!user || !user.employeeAccount) {
    await auditService.logAction({
      performedBy: null,
      actionDescription: `Unauthorized login attempt for email ${phoneNumber}`,
      affectedResourceId: null,
      affectedResourceType: null,
    });

    throw new HttpException(HttpStatus.BAD_REQUEST, 'Invalid phone number or password');
  }

  const isMatch = await authService.comparePassword(password, user.hashedPassword);

  if (!isMatch) {
    await auditService.logAction({
      performedBy: null,
      actionDescription: `Invalid login attempt for phone number ${phoneNumber}`,
      affectedResourceId: null,
      affectedResourceType: null,
    });

    throw new HttpException(HttpStatus.BAD_REQUEST, 'Invalid phone number or password');
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

const handleCustomerSignUp = expressAsyncHandler(async (req: Request, res: Response) => {
  const signupDataSchema = z.object({
    name: z.string().trim(),
    email: z.email(),
    phoneNumber: z
      .string()
      .trim()
      .transform((val, ctx) => {
        try {
          return normalizePhoneNumber(val); // normalize and return E.164 format
        } catch (err) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid phone number format',
          });
          return z.NEVER; // stop transformation on failure
        }
      }),
    password: z.string().min(8).trim(),
  });

  const { name, email, phoneNumber, password } = signupDataSchema.parse(req.body);

  const userRepository = databaseClient.getRepository(User);
  const customerRepository = databaseClient.getRepository(Customer);

  const existingUser = await userRepository
    .createQueryBuilder('user')
    .where('user.email = :email', { email })
    .orWhere('user.phone_number = :phoneNumber', { phoneNumber })
    .getOne();

  if (existingUser) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'User with this phone number or email already exists, please login.');
  }

  const user = await databaseClient.transaction(async (manager) => {
    const photoUrl = `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(name)}`;

    const hashedPassword = await authService.hashPassword(password);

    const user = userRepository.create({
      name,
      email,
      phoneNumber,
      photoUrl,
      hashedPassword,
    });

    const savedUser = await manager.save(User, user);

    // Check if a Customer already exists by phone number
    let customer = await customerRepository.findOne({
      where: { phoneNumber },
    });

    if (customer) {
      customer.userAccount = savedUser;
      customer.name = customer.name || name; // Optionally update name if blank
      await manager.save(Customer, customer);
    } else {
      customer = customerRepository.create({
        name,
        phoneNumber,
        userAccount: savedUser,
      });

      await manager.save(Customer, customer);
    }

    return savedUser;
  });

  const userAgent = req.headers['user-agent'] ?? null;

  const session = await authService.createSession(user, userAgent);

  res.status(HttpStatus.CREATED).send(
    formatSuccessResponse('Signup successful', {
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

const handleCustomerLogin = expressAsyncHandler(async (req: Request, res: Response) => {
  const loginDataSchema = z.object({
    email: z.email(),
    password: z.string().min(8).trim(),
  });

  const requestBody = req.body;

  const { email, password } = loginDataSchema.parse(requestBody);

  const user = await databaseClient
    .getRepository(User)
    .createQueryBuilder('user')
    .where('user.email = :email', { email })
    .leftJoinAndSelect('user.customerAccount', 'customerAccount')
    .getOne();

  if (!user) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'Account does not exist, please signup');
  }

  if (!user.customerAccount) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const isMatch = await authService.comparePassword(password, user?.hashedPassword);

  if (!isMatch) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'Invalid email or password');
  }

  const userAgent = req.headers['user-agent'] ?? null;

  const session = await authService.createSession(user, userAgent);

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
        customerId: user.customerAccount.id,
      },
    }),
  );
});

const handleCustomerAuthentication = expressAsyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new HttpException(HttpStatus.FORBIDDEN, 'Forbidden');
  }

  if (!user.customerAccount) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  res.status(HttpStatus.OK).send(
    formatSuccessResponse('Authenticated', {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
      customerId: user.customerAccount.id,
    }),
  );
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
  handleCustomerSignUp,
  handleCustomerLogin,
  handleCustomerAuthentication,
};
