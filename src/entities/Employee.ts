import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
} from 'typeorm';

import { User } from './User';
import { EmployeeRole } from './EmployeeRole';

export const employeeTypes = ['admin', 'driver', 'rider'] as const;

export type EmployeeType = (typeof employeeTypes)[number];

@Entity({ name: 'employees' })
export class Employee extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.employeeAccount, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_account_id' })
  userAccount!: User;

  @Column({
    type: 'varchar',
  })
  type!: EmployeeType;

  @Column({ default: false })
  isOnline!: boolean;

  @ManyToOne(() => EmployeeRole, (role) => role.employees, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role!: EmployeeRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
