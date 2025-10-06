import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

import { User } from './User';
import { EmployeeRole } from './EmployeeRole';

@Entity({ name: 'employees' })
export class Employee extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.employeeAccount, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_account_id' })
  userAccount!: User;

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
