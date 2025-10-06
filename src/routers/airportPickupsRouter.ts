import { Router } from 'express';

import authMiddleware from '../middleware/authMiddleware';
import airportPickupsController from '../controllers/airportPickupsController';

const airportPickupsRouter = Router();

// airports
airportPickupsRouter.get('/airports', authMiddleware, airportPickupsController.handleGetAirports);
airportPickupsRouter.get('/airports/public', authMiddleware, airportPickupsController.handleGetPublicAirports);
airportPickupsRouter.post('/airports', authMiddleware, airportPickupsController.handleCreateAirport);
airportPickupsRouter.put('/airports/:airportId', authMiddleware, airportPickupsController.handleUpdateAirport);
airportPickupsRouter.delete('/airports/:airportId', authMiddleware, airportPickupsController.handleDeleteAirport);
// airport pickup bookings
airportPickupsRouter.post('/bookings', authMiddleware, airportPickupsController.handleCreateAirportPickupBooking);

export default airportPickupsRouter;
