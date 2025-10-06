import { Router } from 'express';

import authMiddleware from '../middleware/authMiddleware';
import auditLogsController from '../controllers/auditLogsController';

const auditLogsRouter = Router();

auditLogsRouter.get('', authMiddleware, auditLogsController.handleGetAuditLogs);

export default auditLogsRouter;
