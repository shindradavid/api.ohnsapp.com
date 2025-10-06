import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { Session } from './Session';
import { Employee } from './Employee';
import { Customer } from './Customer';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  phoneNumber!: string | null;

  @Column({ name: 'email', unique: true, type: 'varchar' })
  email?: string;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;

  @Column({ name: 'photo_url', type: 'varchar' })
  photoUrl!: string;

  @Column({ name: 'hashed_password', type: 'varchar' })
  hashedPassword!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions!: Session[];

  @OneToOne(() => Employee, (employee) => employee.userAccount)
  employeeAccount!: Employee;

  @OneToOne(() => Customer, (customer) => customer.userAccount)
  customerAccount!: Customer;
}
