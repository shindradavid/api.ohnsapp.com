import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { HttpStatus } from '../enums';
import { Session } from '../entities/Session';
import { HttpException } from '../exceptions';
import { User } from '../entities/User';
import { EmployeePermission } from '../entities/EmployeeRole';

export const hashPassword = async (plainTextPassword: string) => {
  const saltOrRounds = 10;
  const hashedPassword = await bcrypt.hash(plainTextPassword, saltOrRounds);
  return hashedPassword;
};

export const comparePassword = async (plainTextPassword: string, hashedPassword: string) => {
  const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
  return isMatch;
};

export async function createSession(user: User, userAgent: string | null) {
  const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;
  const sessionExpiryDate = new Date(Date.now() + ONE_DAY_IN_MS * 90);
  const sessionId = randomBytes(32).toString('hex');

  const session = Session.create({
    id: sessionId,
    user: user,
    expiresAt: sessionExpiryDate,
    userAgent: userAgent,
  });

  await session.save();

  return session;
}

export async function getSession() {}

export async function deleteSession(sessionId: string) {
  const session = await Session.findOne({
    where: { id: sessionId },
  });

  if (!session) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Session not found');
  }

  await session.remove();
}

/**
 * Check whether a user has a specific permission.
 *
 * @param user - The user object to check. Can be `null` or `undefined`.
 * @param permission - A valid permission string from `EmployeePermission`.
 * @returns `true` if the user has the given permission, otherwise `false`.
 *
 * @example
 * ```ts
 * hasPermission(user, "view employee"); // true or false
 * ```
 */
export function hasPermission(user: User | null | undefined, permission: EmployeePermission): boolean {
  return user?.employeeAccount?.role?.permissions?.includes(permission) ?? false;
}

/**
 * Check whether a user has **at least one** of the provided permissions.
 *
 * @param user - The user object to check. Can be `null` or `undefined`.
 * @param permissions - An array of permissions to test.
 * @returns `true` if the user has any of the provided permissions, otherwise `false`.
 *
 * @example
 * ```ts
 * hasAnyPermission(user, ["view employee", "edit employee"]); // true if user has one
 * ```
 */
export function hasAnyPermission(user: User | null | undefined, permissions: EmployeePermission[]): boolean {
  return permissions.some((p) => user?.employeeAccount?.role?.permissions?.includes(p));
}

/**
 * Check whether a user has **all** of the provided permissions.
 *
 * @param user - The user object to check. Can be `null` or `undefined`.
 * @param permissions - An array of permissions to test.
 * @returns `true` if the user has all of the provided permissions, otherwise `false`.
 *
 * @example
 * ```ts
 * hasAllPermissions(user, ["view employee", "edit employee"]); // true if user has both
 * ```
 */
export function hasAllPermissions(user: User | null | undefined, permissions: EmployeePermission[]): boolean {
  return permissions.every((p) => user?.employeeAccount?.role?.permissions?.includes(p));
}

export default {
  hashPassword,
  comparePassword,
  createSession,
  getSession,
  deleteSession,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};
