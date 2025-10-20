import { Router } from 'express';

import authMiddleware from '../middleware/authMiddleware';
import airportPickupsController from '../controllers/airportPickupsController';
import formDataMiddleware from '../middleware/formDataMiddleware';

const airportPickupsRouter = Router();

// airports
airportPickupsRouter.get('/airports', authMiddleware, airportPickupsController.handleGetAirports);
airportPickupsRouter.get('/airports/public', authMiddleware, airportPickupsController.handleGetPublicAirports);
airportPickupsRouter.post('/airports', authMiddleware, airportPickupsController.handleCreateAirport);
airportPickupsRouter.put('/airports/:airportId', authMiddleware, airportPickupsController.handleUpdateAirport);
airportPickupsRouter.delete('/airports/:airportId', authMiddleware, airportPickupsController.handleDeleteAirport);
// airport pickup bookings
airportPickupsRouter.post('/bookings', authMiddleware, airportPickupsController.handleCreateAirportPickupBooking);
// ride options
airportPickupsRouter.post(
  '/ride-options',
  [formDataMiddleware.single('photo'), authMiddleware],
  airportPickupsController.handleCreateAirportPickupRideOption,
);
airportPickupsRouter.get('/ride-options', authMiddleware, airportPickupsController.handleGetAirportPickupRideOptions);

export default airportPickupsRouter;
