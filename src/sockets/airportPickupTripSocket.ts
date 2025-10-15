import { Server, Socket } from 'socket.io';
import { Trip } from '../entities/Trip';
import databaseClient from '../config/databaseClient';

export function airportPickupTripSocket(io: Server, socket: Socket) {
  socket.on('join_trip', ({ tripId, userId, role }) => {
    socket.join(tripId);
    socket.data = { tripId, userId, role };
    console.log(`${role} joined trip ${tripId}`);
  });

  socket.on('driver_location_update', async ({ tripId, lat, lng }) => {
    await databaseClient.getRepository(Trip).update(tripId, { driverLocation: { lat, lng } });
    io.to(tripId).emit('driver_location_update', { lat, lng });
  });

  socket.on('customer_location_update', async ({ tripId, lat, lng }) => {
    await databaseClient.getRepository(Trip).update(tripId, { customerLocation: { lat, lng } });
    io.to(tripId).emit('customer_location_update', { lat, lng });
  });
}
