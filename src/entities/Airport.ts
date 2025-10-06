import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'airports' })
export class Airport extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // e.g. "Entebbe International Airport"
  @Column({ name: 'name', unique: true })
  name!: string;

  // IATA code like "EBB"
  @Column({ name: 'code', unique: true })
  code!: string;

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 8 })
  latitude!: number;

  @Column({ name: 'longitude', type: 'decimal', precision: 11, scale: 8 })
  longitude!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
