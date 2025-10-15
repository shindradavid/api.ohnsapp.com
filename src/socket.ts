import { Server as SocketIoServer } from 'http';
import { Server } from 'socket.io';

import { airportPickupTripSocket } from './sockets/airportPickupTripSocket';
import databaseClient from './config/databaseClient';
import { Session } from './entities/Session';

export function setupSocket(httpServer: SocketIoServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.on('connection', async (socket) => {
    const sessionId = socket.handshake.auth?.sessionId || socket.handshake.headers['x-session-id'];

    if (!sessionId || typeof sessionId !== 'string') {
      console.log('❌ Missing session ID');
      return socket.disconnect();
    }

    const sessionRepo = databaseClient.getRepository(Session);

    const session = await sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('user.employeeAccount', 'employeeAccount')
      .where('session.id = :id', { id: sessionId })
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .getOne();

    if (!session || !session.user.employeeAccount) {
      console.log('❌ Invalid session or no employee account');
      return socket.disconnect();
    }

    socket.data.user = session.user;

    console.log('🟢 Socket connected:', socket.id);

    airportPickupTripSocket(io, socket);

    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected:', socket.id);
    });
  });

  return io;
}
