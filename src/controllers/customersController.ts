import { z } from 'zod';
import { type Request, type Response } from 'express';
import expressAsyncHandler from 'express-async-handler';

import databaseClient from '../config/databaseClient';
import { User } from '../entities/User';
import { HttpStatus } from '../enums';
import { formatSuccessResponse, normalizePhoneNumber } from '../utils';
import { HttpException } from '../exceptions';
import { Customer } from '../entities/Customer';
import storageService from '../services/storageService';

const handleEditCustomerProfile = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser?.customerAccount) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const editCustomerProfileSchema = z.object({
    name: z.string().min(1, { message: 'Name is required.' }).optional(),
    phoneNumber: z
      .string()
      .trim()
      .transform((val, ctx) => {
        try {
          return normalizePhoneNumber(val);
        } catch {
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid phone number format',
          });
          return z.NEVER;
        }
      })
      .optional(),
  });

  const { name, phoneNumber } = editCustomerProfileSchema.parse(req.body);

  const customerRepository = databaseClient.getRepository(Customer);
  const userRepository = databaseClient.getRepository(User);

  const customer = await customerRepository.findOne({
    where: { id: authUser.customerAccount.id },
    relations: ['userAccount'],
  });

  if (!customer) {
    throw new HttpException(HttpStatus.NOT_FOUND, 'Customer not found');
  }

  if (name) {
    customer.name = name;
  }
  if (phoneNumber) {
    customer.phoneNumber = phoneNumber;
  }

  const user = customer.userAccount;

  if (user) {
    if (name) {
      user.name = name;
    }

    if (phoneNumber) {
      user.phoneNumber = phoneNumber;
    }
  }

  const photo = req.file;

  if (photo) {
    const photoUrl = await storageService.uploadImageFile(photo, 'customer-photos');

    if (user) {
      user.photoUrl = photoUrl;
    }
  }

  await customerRepository.save(customer);

  if (user) {
    await userRepository.save(user);
  }

  const updatedCustomer = await customerRepository.findOne({
    where: { id: customer.id },
    relations: ['userAccount'],
  });

  res.status(HttpStatus.OK).json(formatSuccessResponse('Profile updated successfully', updatedCustomer));
});

export default {
  handleEditCustomerProfile,
};
