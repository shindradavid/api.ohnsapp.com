/// <reference path="./app.d.ts" />

import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { envHelper } from './helpers';
// import { setupSocket } from './socket';
import databaseClient from './config/databaseClient';
import requestLoggingMiddleware from './middleware/requestLoggingMiddleware';
import errorHandlingMiddleware from './middleware/errorHandlingMiddleware';
import auditLogsRouter from './routers/auditLogsRouter';
import authRouter from './routers/authRouter';
import employeesRouter from './routers/employeesRouter';
import airportPickupsRouter from './routers/airportPickupsRouter';

async function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
      message: {
        success: false,
        error: 'Too many requests, please try again later.',
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
    }),
  );
  app.use(requestLoggingMiddleware);

  // http routers
  app.use('/audit-logs', auditLogsRouter);
  app.use('/auth', authRouter);
  app.use('/employees', employeesRouter);
  app.use('/airport-pickups', airportPickupsRouter);

  app.use(errorHandlingMiddleware);

  try {
    await databaseClient.initialize();
    console.log('✅ Database client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database connection:', error);
    process.exit(1);
  }

  const server = http.createServer(app);
  // const io = setupSocket(server);

  // socket handlers

  const PORT = envHelper.PORT;
  const HOST = envHelper.HOST;

  server.listen(PORT, HOST, () => {
    console.log(`✅ Server is running at http://${HOST}:${PORT}`);
  });

  // Graceful shutdown logic
  const gracefulShutdownHandler = async (signal: NodeJS.Signals) => {
    console.log(`⚠️ Caught ${signal}, gracefully shutting down...`);

    server.close(async () => {
      console.log('HTTP server closed.');

      if (databaseClient.isInitialized) {
        try {
          await databaseClient.destroy();
          console.log('🗃️ Database connection closed');
        } catch (err) {
          console.error('❌ Error during database shutdown:', err);
        }
      }

      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdownHandler);
  process.on('SIGINT', gracefulShutdownHandler);
}

createApp();
