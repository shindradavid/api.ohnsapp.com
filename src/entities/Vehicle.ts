import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'vehicles' })
export class Vehicle extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', length: 255, unique: true })
  name!: string;

  @Column({ name: 'slug', length: 255, unique: true })
  slug!: string;

  @Column({ type: 'int' })
  seats!: number;

  @Column({ name: 'primary_photo_url', type: 'varchar' })
  primaryPhotoUrl!: string;

  @Column('text', { array: true, nullable: true, default: [] })
  photos?: string[];

  @Column({ name: 'plate_number', unique: true })
  plateNumber!: string;

  @Column({ name: 'color', nullable: true })
  color?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
