import { DataSource } from 'typeorm';

import envHelper from '../helpers/envHelper';
import { User } from '../entities/User';
import { Session } from '../entities/Session';
import { AuditLog } from '../entities/AuditLog';
import { Employee } from '../entities/Employee';
import { EmployeeRole } from '../entities/EmployeeRole';
import { Customer } from '../entities/Customer';
import { Airport } from '../entities/Airport';
import { AirportPickupRideOptions } from '../entities/AirportPickupRideOptions';

const databaseClient = new DataSource({
  type: 'postgres',
  host: envHelper.DB_HOST,
  port: envHelper.DB_PORT,
  username: envHelper.DB_USER,
  password: envHelper.DB_PASSWORD,
  database: envHelper.DB_NAME,
  synchronize: true,
  entities: [AuditLog, User, Session, Employee, EmployeeRole, Customer, Airport, AirportPickupRideOptions],
  migrations: ['src/migrations/**/*.ts'],
  migrationsTableName: 'migrations',
});

export default databaseClient;
