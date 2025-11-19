import { Router } from 'express';

import authMiddleware from '../middleware/authMiddleware';
import formDataMiddleware from '../middleware/formDataMiddleware';
import customersController from '../controllers/customersController';

const customersRouter = Router();

customersRouter.patch(
  '',
  [authMiddleware, formDataMiddleware.single('photo')],
  customersController.handleEditCustomerProfile,
);

export default customersRouter;
