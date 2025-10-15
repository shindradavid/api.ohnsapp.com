import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  BaseEntity,
  OneToMany,
} from 'typeorm';

import { User } from './User';
import { AirportPickupBooking } from './AirportPickupBooking';

@Entity({ name: 'customers' })
export class Customer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name' })
  name!: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  phoneNumber!: string | null;

  @OneToOne(() => User, (user) => user.customerAccount, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  userAccount!: User | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // preferred currency

  // @OneToMany(() => AirportPickupBooking, (airportPickupBooking) => airportPickupBooking.customer)
  // airportPickupBookings!: AirportPickupBooking[];
}
