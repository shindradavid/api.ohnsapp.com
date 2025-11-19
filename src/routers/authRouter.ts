import { Router } from 'express';

import authMiddleware from '../middleware/authMiddleware';
import authController from '../controllers/authController';

const authRouter = Router();

authRouter.delete('/logout', authMiddleware, authController.handleLogout);
// employees
authRouter.get('/employees', authMiddleware, authController.handleEmployeeAuthentication);
authRouter.post('/employees/login', authController.handleEmployeeLogin);
authRouter.delete('employees/logout', authMiddleware, authController.handleLogout);
authRouter.delete('/sessions/:sessionId', authMiddleware, authController.handleDeleteSession);
authRouter.get('/sessions', authMiddleware, authController.handleGetUserSessions);
// customers
authRouter.get('/customers', authMiddleware, authController.handleCustomerAuthentication);
authRouter.post('/customers/signup', authController.handleCustomerSignUp);
authRouter.post('/customers/login', authController.handleCustomerLogin);

export default authRouter;
