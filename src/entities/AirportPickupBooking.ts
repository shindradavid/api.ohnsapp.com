import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

import { Employee } from './Employee';
import { Vehicle } from './Vehicle';
import { Airport } from './Airport';
import { Customer } from './Customer';

export const AIRPORT_BOOKING_STATUSES = [
  'pending_payment',
  'accepted',
  'driver_en_route_to_pickup',
  'driver_arrived_at_pickup',
  'in_progress',
  'completed',
  'cancelled_by_customer',
  'cancelled_by_driver',
  'cancelled_by_admin',
] as const;

export type AirportBookingStatus = (typeof AIRPORT_BOOKING_STATUSES)[number];

@Entity({ name: 'airport_pickup_bookings' })
export class AirportPickupBooking extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'fare',
    type: 'numeric',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  fare!: number;

  @ManyToOne(() => Airport, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'airport_id' })
  airport!: Airport;

  @Column({
    type: 'enum',
    enum: AIRPORT_BOOKING_STATUSES,
    default: 'pending',
  })
  status!: AirportBookingStatus;

  @Column({ name: 'note', type: 'text', nullable: true })
  note!: string | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver!: Employee;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'drop_off_latitude', type: 'decimal', precision: 10, scale: 8 })
  dropOffLatitude!: number;

  @Column({ name: 'drop_off_longitude', type: 'decimal', precision: 11, scale: 8 })
  dropOffLongitude!: number;

  @Column({ name: 'drop_off_location_name', type: 'text', nullable: true })
  dropOffLocationName!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
