import { Router } from 'express';

import authMiddleware from '../middleware/authMiddleware';
import authController from '../controllers/authController';

const authRouter = Router();

// employees
authRouter.get('/employees', authMiddleware, authController.handleEmployeeAuthentication);
authRouter.post('/employees/login', authController.handleEmployeeLogin);
authRouter.delete('employees/logout', authMiddleware, authController.handleLogout);
authRouter.delete('/sessions/:sessionId', authMiddleware, authController.handleDeleteSession);
authRouter.get('/sessions', authMiddleware, authController.handleGetUserSessions);

export default authRouter;
