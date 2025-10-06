import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, BaseEntity } from 'typeorm';

import { Employee } from './Employee';

@Entity({ name: 'audit_logs' })
export class AuditLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Employee, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  performedBy!: Employee | null;

  @Column({ name: 'target_id', type: 'varchar', nullable: true })
  affectedResourceId?: string | null;

  @Column({ name: 'target_type', type: 'varchar', nullable: true })
  affectedResourceType?: string | null;

  @Column({ name: 'description', type: 'text' })
  actionDescription!: string;

  @CreateDateColumn({ name: 'created_at' })
  timestamp!: Date;
}
