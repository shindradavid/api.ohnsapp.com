import { Router } from 'express';

import authMiddleware from '../middleware/authMiddleware';
import employeesController from '../controllers/employeesController';
import formDataMiddleware from '../middleware/formDataMiddleware';

const employeesRouter = Router();

employeesRouter.get('/roles', authMiddleware, employeesController.handleGetEmployeeRoles);
employeesRouter.get('/roles/:roleSlug', authMiddleware, employeesController.handleGetEmployeeRoleDetails);
employeesRouter.put('/roles/:roleSlug', authMiddleware, employeesController.handleUpdateEmployeeRole);
employeesRouter.delete('/roles/:roleId', authMiddleware, employeesController.handleDeleteEmployeeRole);
employeesRouter.post('/roles', authMiddleware, employeesController.handleCreateEmployeeRole);
employeesRouter.get('/:employeeId', authMiddleware, employeesController.handleGetEmployeeDetails);
employeesRouter.get('', authMiddleware, employeesController.handleGetEmployees);
employeesRouter.post('', [formDataMiddleware.single('photo'), authMiddleware], employeesController.handleCreateEmployee);

export default employeesRouter;
