import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn, BaseEntity, UpdateDateColumn } from 'typeorm';

import { User } from './User';

@Entity({ name: 'sessions' })
export class Session extends BaseEntity {
  @Column({ name: 'id', type: 'varchar', primary: true })
  id!: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
