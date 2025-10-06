import { type Request, type Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { z } from 'zod';

import databaseClient from '../config/databaseClient';
import { HttpException } from '../exceptions';
import { HttpStatus } from '../enums';
import { formatSuccessResponse } from '../utils';
import { AuditLog } from '../entities/AuditLog';
import { hasPermission } from '../services/authService';

const handleGetAuditLogs = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser || !hasPermission(authUser, 'view audit logs')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const { date } = z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    })
    .parse(req.query);

  const auditLogRepository = databaseClient.getRepository(AuditLog);

  const auditLogs = await auditLogRepository
    .createQueryBuilder('auditLog')
    .leftJoinAndSelect('auditLog.performedBy', 'employee')
    .leftJoinAndSelect('employee.userAccount', 'userAccount')
    .where('DATE(auditLog.created_at) = :date', { date })
    .orderBy('auditLog.created_at', 'DESC')
    .getMany();

  res.status(HttpStatus.OK).send(formatSuccessResponse('Success', auditLogs));
});

export default {
  handleGetAuditLogs,
};
