import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'airport_pickup_service_categories' })
export class AirportPickupServiceCategory extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // e.g. "Ordinary", "VIP", "Executive"
  @Column({ name: 'name' })
  name!: string;

  @Column({
    name: 'price_per_mile_ugx',
    type: 'numeric',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  pricePerMileUgx!: number;

  @Column({
    name: 'price_per_mile_usd',
    type: 'numeric',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  pricePerMileUsd!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
