import { z } from 'zod';
import inquirer from 'inquirer';

import databaseClient from '../config/databaseClient';
import authService from '../services/authService';
import { User } from '../entities/User';
import { normalizePhoneNumber } from '../utils';
import { AllPermissions, EmployeeRole } from '../entities/EmployeeRole';
import { Employee } from '../entities/Employee';

async function main() {
  const inputSchema = z.object({
    name: z.string(),
    email: z.email(),
    phoneNumber: z
      .string()
      .trim()
      .transform((val, ctx) => {
        try {
          return normalizePhoneNumber(val);
        } catch (err) {
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid phone number format',
          });
          return z.NEVER;
        }
      }),
    password: z.string().min(8),
  });

  const answers = await inquirer.prompt([
    { type: 'input', name: 'name', message: 'Full Name:' },
    { type: 'input', name: 'email', message: 'Email Address:' },
    { type: 'input', name: 'phoneNumber', message: 'Phone Number:' },
    { type: 'password', name: 'password', message: 'Password:', mask: '*' },
  ]);

  const input = inputSchema.parse(answers);

  await databaseClient.initialize();

  const userRepository = databaseClient.getRepository(User);
  const employeeRoleRepository = databaseClient.getRepository(EmployeeRole);

  let adminRole = await employeeRoleRepository.findOne({ where: { name: 'Admin' } });

  if (!adminRole) {
    adminRole = employeeRoleRepository.create({
      name: 'Admin',
      slug: 'admin',
      permissions: Object.values(AllPermissions),
    });

    await employeeRoleRepository.save(adminRole);

    console.log('✅ Created Admin role with all permissions.');
  } else {
    console.log('ℹ️ Admin role already exists.');
  }

  const existing = await userRepository.findOne({
    where: [{ email: input.email }, { phoneNumber: input.phoneNumber }],
  });

  if (existing) {
    console.error('❌ A user with this email or phone number already exists.');

    await databaseClient.destroy();

    process.exit(1);
  }

  const hashedPassword = await authService.hashPassword(input.password);

  await databaseClient.transaction(async (manager) => {
    const user = await manager.save(User, {
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      hashedPassword,
      photoUrl: `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(input.name)}`,
    });

    await manager.save(Employee, {
      userAccount: user,
      role: adminRole,
      type: 'admin',
    });

    console.log(`✅ Admin user "${user.name}" created with email ${user.email}`);
  });

  await databaseClient.destroy();

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to create admin user:', err);
  process.exit(1);
});
