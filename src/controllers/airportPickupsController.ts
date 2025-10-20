import { z } from 'zod';
import axios from 'axios';
import expressAsyncHandler from 'express-async-handler';
import { type Request, type Response } from 'express';
import { parseStringPromise } from 'xml2js';

import databaseClient from '../config/databaseClient';
import { HttpException } from '../exceptions';
import { HttpStatus } from '../enums';
import { formatSuccessResponse } from '../utils';
import { Airport } from '../entities/Airport';
import { AirportPickupBooking } from '../entities/AirportPickupBooking';
import { AirportPickupRideOptions } from '../entities/AirportPickupRideOptions';
import { envHelper } from '../helpers';
import { AirportPickupBookingPayment } from '../entities/AirportPickupBookingPayment';
import storageService from '../services/storageService';

const handleCreateAirport = expressAsyncHandler(async (req: Request, res: Response) => {
  const createAirportDataSchema = z.object({
    name: z.string().trim(),
    code: z.string().trim().toUpperCase(),
    latitude: z.number(),
    longitude: z.number(),
  });

  const { name, code, latitude, longitude } = createAirportDataSchema.parse(req.body);

  const existingAirport = await Airport.findOne({
    where: [{ name }, { code }],
  });

  if (existingAirport) {
    throw new HttpException(HttpStatus.CONFLICT, 'Airport with this name or code already exists');
  }

  const airport = Airport.create({
    name,
    code,
    latitude,
    longitude,
  });

  await airport.save();

  res.status(HttpStatus.CREATED).json(formatSuccessResponse('Airport created successfully', airport));
});

const handleGetPublicAirports = expressAsyncHandler(async (req: Request, res: Response) => {
  const airports = await Airport.find({
    where: { isActive: true },
  });

  res.status(HttpStatus.OK).json(formatSuccessResponse('Success', airports));
});

const handleGetAirports = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser || !authUser?.employeeAccount) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const airports = await Airport.find();

  res.status(HttpStatus.OK).json(formatSuccessResponse('Success', airports));
});

const handleUpdateAirport = expressAsyncHandler(async (req: Request, res: Response) => {});

const handleDeleteAirport = expressAsyncHandler(async (req: Request, res: Response) => {});

const handleCreateAirportPickupRideOption = expressAsyncHandler(async (req: Request, res: Response) => {
  const createAirportPickupRideOptionDataSchema = z.object({
    name: z.string().trim(),
    pricePerMileUgx: z.coerce.number(),
    pricePerMileUsd: z.coerce.number(),
  });

  const { name, pricePerMileUgx, pricePerMileUsd } = createAirportPickupRideOptionDataSchema.parse(req.body);

  const file = req.file;

  if (!file) {
    throw new HttpException(HttpStatus.BAD_REQUEST, 'No photo uploaded');
  }

  const photoUrl = await storageService.uploadImageFile(file, 'airport-pickup-ride-options');

  const airportPickupRideOptions = await AirportPickupRideOptions.save({
    name,
    pricePerMileUgx,
    pricePerMileUsd,
    photoUrl,
  });

  res.status(HttpStatus.CREATED).json(formatSuccessResponse('Ride option created successfully', airportPickupRideOptions));
});

const handleGetAirportPickupRideOptions = expressAsyncHandler(async (req: Request, res: Response) => {
  const airportPickupRideOptions = await AirportPickupRideOptions.find();

  res.status(HttpStatus.OK).json(formatSuccessResponse('Success', airportPickupRideOptions));
});

const handleCreateAirportPickupBooking = expressAsyncHandler(async (req: Request, res: Response) => {
  const authUser = req.user;

  if (!authUser || !authUser?.customerAccount) {
    throw new HttpException(HttpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const createAirportPickupBookingDataSchema = z.object({
    airportId: z.uuidv4(),
    serviceCategoryId: z.uuidv4(),
    note: z.string().nullable(),
    dropOffLocationLatitude: z.number(),
    dropOffLocationLongitude: z.number(),
    dropOffLocationName: z.string(),
    fare: z.number(),
    currency: z.enum(['UGX', 'USD']),
  });

  const {
    fare,
    currency,
    serviceCategoryId,
    airportId,
    dropOffLocationLatitude,
    dropOffLocationLongitude,
    dropOffLocationName,
    note,
  } = createAirportPickupBookingDataSchema.parse(req.body);

  const transactionResults = await databaseClient.manager.transaction(async (transactionalEntityManager) => {
    const airportRepository = transactionalEntityManager.getRepository(Airport);
    const airportPickupServiceCategoryRepository = transactionalEntityManager.getRepository(AirportPickupRideOptions);
    const airportPickupBookingPaymentRepository = transactionalEntityManager.getRepository(AirportPickupBookingPayment);

    const airport = await airportRepository.findOne({ where: { id: airportId } });

    if (!airport) {
      throw new HttpException(HttpStatus.NOT_FOUND, 'Airport not found, signup');
    }

    const serviceCategory = await airportPickupServiceCategoryRepository.findOne({ where: { id: serviceCategoryId } });

    if (!serviceCategory) {
      throw new HttpException(HttpStatus.NOT_FOUND, 'Service category not found, signup');
    }

    const airportPickupBookingRepository = transactionalEntityManager.getRepository(AirportPickupBooking);

    const booking = airportPickupBookingRepository.create({
      fare,
      airport,
      note,
      dropOffLatitude: dropOffLocationLatitude,
      dropOffLongitude: dropOffLocationLongitude,
      dropOffLocationName: dropOffLocationName,
      status: 'pending',
      customer: authUser.customerAccount,
    });

    const newBooking = await airportPickupBookingRepository.save(booking);

    const payment = airportPickupBookingPaymentRepository.create({
      booking,
      amount: fare,
      status: 'pending',
      method: null,
      gatewayReference: null,
    });

    const bookingPayment = await airportPickupBookingPaymentRepository.save(payment);

    return { newBooking, bookingPayment };
  });

  const DPO_BASE_URL = 'https://secure.3gdirectpay.com/API/v6/';
  const REDIRECT_URL = `https://api.ohnsapp.iconiksoftware.com/payments/${transactionResults.bookingPayment.id}/airport-pickups/success`;
  const BACK_URL = `https://api.ohnsapp.iconiksoftware.com/payments/${transactionResults.bookingPayment.id}/airport-pickups/failure`;

  const xmlBody = `
    <?xml version="1.0" encoding="utf-8"?>
    <API3G>
      <CompanyToken>${envHelper.COMPANY_TOKEN}</CompanyToken>
      <Request>createToken</Request>
      <Transaction>
        <PaymentAmount>${fare}</PaymentAmount>
        <PaymentCurrency>${currency}</PaymentCurrency>
        <CompanyRef>${transactionResults.bookingPayment.id}</CompanyRef>
        <RedirectURL>${REDIRECT_URL}</RedirectURL>
        <BackURL>${BACK_URL}</BackURL>
        <CompanyRefUnique>0</CompanyRefUnique>
        <PTL>5</PTL>
      </Transaction>
      <Services>
        <Service>
          <ServiceType>45</ServiceType>
          <ServiceDescription>Payment for Airport Pickup</ServiceDescription>
          <ServiceDate>${new Date().toISOString()}</ServiceDate>
        </Service>
      </Services>
    </API3G>
  `;

  const response = await axios.post(DPO_BASE_URL, xmlBody, {
    headers: { 'Content-Type': 'application/xml' },
  });

  const parsed = await parseStringPromise(response.data);
  const token = parsed.API3G?.TransactionToken?.[0];

  res.status(HttpStatus.CREATED).json(
    formatSuccessResponse('Booking created', {
      booking: transactionResults.newBooking,
      paymentToken: token,
    }),
  );
});

const handleGetAirportPickupBookings = expressAsyncHandler(async (req: Request, res: Response) => {});

export default {
  handleCreateAirport,
  handleGetAirports,
  handleGetPublicAirports,
  handleDeleteAirport,
  handleUpdateAirport,
  handleCreateAirportPickupBooking,
  handleGetAirportPickupBookings,
  handleCreateAirportPickupRideOption,
  handleGetAirportPickupRideOptions,
};
