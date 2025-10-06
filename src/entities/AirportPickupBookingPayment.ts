import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';

import { AirportPickupBooking } from './AirportPickupBooking';

@Entity({ name: 'airport_pickup_booking_payments' })
export class AirportPickupBookingPayment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AirportPickupBooking)
  @JoinColumn({ name: 'booking_id' })
  booking!: AirportPickupBooking;

  @Column({
    type: 'numeric',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount!: number;

  @Column({
    type: 'enum',
    enum: ['cash', 'mobile_money', 'card'],
    nullable: true,
  })
  method!: 'cash' | 'mobile_money' | 'card' | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'confirmed' | 'failed';

  @Column({ type: 'text', nullable: true })
  gatewayReference!: string | null;

  @CreateDateColumn()
  createdAt!: Date | null;

  @UpdateDateColumn()
  updatedAt!: Date | null;
}
