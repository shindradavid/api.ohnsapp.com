import { AuditLog } from '../entities/AuditLog';
import { Employee } from '../entities/Employee';
import { Session } from '../entities/Session';
import { User } from '../entities/User';

export const entities = {
  User,
  Employee,
  Session,
} as const;

type EntityTypeName = keyof typeof entities;

type LogAuditArgs = {
  performedBy: Employee | null;
  actionDescription: string;
  affectedResourceId: string | null;
  affectedResourceType: EntityTypeName | null;
};

export const auditService = {
  async logAction({
    performedBy,
    actionDescription,
    affectedResourceId,
    affectedResourceType,
  }: LogAuditArgs) {
    const log = AuditLog.create({
      performedBy,
      actionDescription,
      affectedResourceId,
      affectedResourceType,
    });

    await log.save();
  },
};
