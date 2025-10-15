import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

import { Employee } from './Employee';

export const PermissionGroups = {
  employeeRole: ['view employee role', 'create employee role', 'delete employee role', 'edit employee role'],
  employee: ['view employee', 'create employee', 'delete employee', 'edit employee'],
  vehicle: ['view vehicle', 'create vehicle', 'delete vehicle', 'edit vehicle'],
  airport: ['view airport', 'create airport', 'delete airport', 'edit airport'],
  customer: ['view customer', 'create customer', 'delete customer', 'edit customer'],
  auditLog: ['view audit log'],
} as const;

export type EmployeePermission = (typeof PermissionGroups)[keyof typeof PermissionGroups][number];

export const AllPermissions = Object.values(PermissionGroups).flat() as EmployeePermission[];

@Entity({ name: 'employee_roles' })
export class EmployeeRole extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({
    type: 'varchar',
    array: true,
    default: [],
  })
  permissions!: EmployeePermission[];

  @OneToMany(() => Employee, (employee) => employee.role)
  employees!: Employee[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
