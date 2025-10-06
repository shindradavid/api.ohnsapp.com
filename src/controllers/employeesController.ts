import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import z from 'zod';

import { formatSuccessResponse, normalizePhoneNumber, slugify } from '../utils';
import databaseClient from '../config/databaseClient';
import { HttpStatus } from '../enums';
import { Employee } from '../entities/Employee';
import { EmployeePermission, EmployeeRole, PermissionGroups } from '../entities/EmployeeRole';
import { hashPassword, hasPermission } from '../services/authService';
import { HttpException } from '../exceptions';
import { User } from '../entities/User';
import storageService from '../services/storageService';

const AllPermissions = Object.values(PermissionGroups).flat() as EmployeePermission[];

const handleGetEmployees = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!hasPermission(authUser, 'view employee')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const getEmployeesQuerySchema = z.object({
    page: z
      .string()
      .optional()
      .transform((val) => parseInt(val || '1', 10))
      .refine((val) => !isNaN(val) && val > 0, { message: 'Invalid page number' }),
    limit: z
      .string()
      .optional()
      .transform((val) => parseInt(val || '30', 10))
      .refine((val) => !isNaN(val) && val > 0, { message: 'Invalid limit' }),
  });

  const { page, limit } = getEmployeesQuerySchema.parse(req.query);

  const MAX_LIMIT = 40;

  if (limit > MAX_LIMIT) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'Max limit exceeded');
  }

  const offset = (page - 1) * limit;

  const employeeRepository = databaseClient.getRepository(Employee);

  const [employees, total] = await employeeRepository
    .createQueryBuilder('employee')
    .leftJoinAndSelect('employee.userAccount', 'userAccount')
    .leftJoinAndSelect('employee.role', 'role')
    .skip(offset)
    .take(limit)
    .getManyAndCount();

  res.status(HttpStatus.OK).send(
    formatSuccessResponse('Success', {
      employees: employees.map((employee) => {
        return {
          id: employee.id,
          name: employee.userAccount.name,
          email: employee.userAccount.email,
          phoneNumber: employee.userAccount.phoneNumber,
          photoUrl: employee.userAccount.photoUrl,
          role: employee.role,
          isActive: employee.userAccount.isActive,
          createdAt: employee.userAccount.createdAt,
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
});

const handleGetEmployeeDetails = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!hasPermission(authUser, 'view employee')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const { employeeId } = z
    .object({
      employeeId: z.string(),
    })
    .parse(req.params);

  const employee = await Employee.createQueryBuilder('employee')
    .leftJoinAndSelect('employee.userAccount', 'userAccount')
    .leftJoinAndSelect('employee.role', 'role')
    .where('employee.id = :employeeId', { employeeId })
    .getOne();

  if (!employee) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Employee not found');
  }

  const responsePayload = {
    id: employee.id,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    userAccount: {
      id: employee.userAccount.id,
      name: employee.userAccount.name,
      email: employee.userAccount.email,
      phoneNumber: employee.userAccount.phoneNumber,
      photoUrl: employee.userAccount.photoUrl,
      isActive: employee.userAccount.isActive,
    },
    role: employee.role,
  };

  res.status(HttpStatus.OK).send(formatSuccessResponse('Success', responsePayload));
});

const handleCreateEmployee = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!hasPermission(authUser, 'create employee')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const createEmployeeSchema = z.object({
    name: z.string().min(1, { message: 'Name is required.' }),
    phoneNumber: z
      .string()
      .trim()
      .transform((val, ctx) => {
        try {
          return normalizePhoneNumber(val); // normalize and return E.164 format
        } catch (err) {
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid phone number format',
          });
          return z.NEVER; // stop transformation on failure
        }
      }),
    email: z.email(),
    password: z.string(),
    roleId: z.uuid(),
  });

  const { name, phoneNumber, email, password, roleId } = createEmployeeSchema.parse(req.body);

  const employeeRoleRepository = databaseClient.getRepository(EmployeeRole);

  const employeeRole = await employeeRoleRepository
    .createQueryBuilder('employeeRole')
    .where('employeeRole.id = :id', { id: roleId })
    .getOne();

  if (!employeeRole) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Not found');
  }

  const employeeRepository = databaseClient.getRepository(Employee);
  const userRepository = databaseClient.getRepository(User);

  const existingUser = await userRepository
    .createQueryBuilder('user')
    .where('user.email = :email OR user.phone_number = :phoneNumber', { email, phoneNumber })
    .getOne();

  if (existingUser) {
    throw new HttpException(HttpStatus.CONFLICT, 'A user with this email or phone number already exists');
  }

  const file = req.file;

  if (!file) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'No profile picture uploaded');
  }

  const photoUrl = await storageService.uploadImageFile(file, 'user-photos');

  const hashedPassword = await hashPassword(password);

  const user = await userRepository.save({
    name,
    email,
    phoneNumber,
    hashedPassword,
    photoUrl,
  });

  const employee = await employeeRepository.save({
    role: employeeRole,
    userAccount: user,
  });

  res.status(HttpStatus.CREATED).send(
    formatSuccessResponse('Success', {
      id: employee.userAccount.id,
      name: employee.userAccount.name,
      email: employee.userAccount.email,
      phoneNumber: employee.userAccount.phoneNumber,
      photoUrl: employee.userAccount.photoUrl,
      role: employee.role,
      isActive: employee.userAccount.isActive,
      createdAt: employee.userAccount.createdAt,
    }),
  );
});

const handleGetEmployeeRoles = expressAsyncHandler(async (req: Request, res: Response) => {
  const getEmployeeRolesQuerySchema = z.object({
    page: z
      .string()
      .optional()
      .transform((val) => parseInt(val || '1', 10))
      .refine((val) => !isNaN(val) && val > 0, { message: 'Invalid page number' }),
    limit: z
      .string()
      .optional()
      .transform((val) => parseInt(val || '30', 10))
      .refine((val) => !isNaN(val) && val > 0, { message: 'Invalid limit' }),
  });

  const { page, limit } = getEmployeeRolesQuerySchema.parse(req.query);

  const MAX_LIMIT = 40;

  if (limit > MAX_LIMIT) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'Max limit exceeded');
  }

  const offset = (page - 1) * limit;

  const employeeRoleRepository = databaseClient.getRepository(EmployeeRole);

  const [employeeRoles, total] = await employeeRoleRepository
    .createQueryBuilder('employeeRole')
    .skip(offset)
    .take(limit)
    .getManyAndCount();

  res.status(HttpStatus.OK).send(
    formatSuccessResponse('Success', {
      employeeRoles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
});

const handleGetEmployeeRoleDetails = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!hasPermission(authUser, 'view employee role')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const { roleSlug } = z
    .object({
      roleSlug: z.string(),
    })
    .parse(req.params);

  const employeeRoleRepository = databaseClient.getRepository(EmployeeRole);

  const employeeRole = await employeeRoleRepository
    .createQueryBuilder('employeeRole')
    .leftJoinAndSelect('employeeRole.employees', 'employees')
    .leftJoinAndSelect('employees.userAccount', 'userAccount')
    .where('employeeRole.slug = :roleSlug', { roleSlug })
    .getOne();

  if (!employeeRole) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Role not found');
  }

  res.status(HttpStatus.OK).send(formatSuccessResponse('Success', employeeRole));
});

const handleUpdateEmployeeRole = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!hasPermission(authUser, 'edit employee role')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const { roleSlug } = z
    .object({
      roleSlug: z.string(),
    })
    .parse(req.params);

  const updateRoleSchema = z.object({
    name: z.string().min(1, 'Role name is required'),
    permissions: z
      .array(z.enum(AllPermissions as [EmployeePermission, ...EmployeePermission[]]))
      .min(1, 'At least one permission is required'),
  });

  const { name, permissions } = updateRoleSchema.parse(req.body);

  const role = await EmployeeRole.findOne({ where: { slug: roleSlug } });

  if (!role) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Role not found');
  }

  role.name = name;
  role.permissions = permissions;

  await role.save();

  res.status(HttpStatus.OK).send(
    formatSuccessResponse('Role updated successfully', {
      id: role.id,
      name: role.name,
      permissions: role.permissions,
      updatedAt: role.updatedAt,
    }),
  );
});

const handleDeleteEmployeeRole = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!hasPermission(authUser, 'delete employee')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const { roleId } = z
    .object({
      roleId: z.string(),
    })
    .parse(req.params);

  const employeeRoleRepository = databaseClient.getRepository(EmployeeRole);

  const employeeRole = await employeeRoleRepository
    .createQueryBuilder('employeeRole')
    .leftJoinAndSelect('employeeRole.employees', 'employees')
    .leftJoinAndSelect('employees.userAccount', 'userAccount')
    .where('employeeRole.slug = :roleSlug', { roleId })
    .getOne();

  if (!employeeRole) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Role not found');
  }

  await employeeRoleRepository.remove(employeeRole);

  res.status(HttpStatus.NO_CONTENT).send(formatSuccessResponse('Success', null));
});

const handleCreateEmployeeRole = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!hasPermission(authUser, 'create employee role')) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const createEmployeeRoleSchema = z.object({
    name: z.string().min(1, { message: 'Name is required.' }),
    permissions: z
      .array(z.enum(AllPermissions as [EmployeePermission, ...EmployeePermission[]]), {
        error: 'Add at least one permission',
      })
      .min(1, { message: 'Add at least one permission' }),
  });

  const { name, permissions } = createEmployeeRoleSchema.parse(req.body);

  const employeeRolesRepository = databaseClient.getRepository(EmployeeRole);

  const existingRole = await employeeRolesRepository.findOne({ where: { name } });

  if (existingRole) {
    throw new HttpException(HttpStatus.CONFLICT, 'Role with this name already exists.');
  }

  const slug = slugify(name);

  const role = employeeRolesRepository.create({
    name,
    slug,
    permissions,
  });

  await employeeRolesRepository.save(role);

  res.status(HttpStatus.CREATED).send(formatSuccessResponse('Employee role created successfully', role));
});

export default {
  handleGetEmployees,
  handleGetEmployeeDetails,
  handleCreateEmployee,
  handleGetEmployeeRoles,
  handleGetEmployeeRoleDetails,
  handleDeleteEmployeeRole,
  handleUpdateEmployeeRole,
  handleCreateEmployeeRole,
};
