import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import z from 'zod';

import { formatSuccessResponse, normalizePhoneNumber, slugify } from '../utils';
import databaseClient from '../config/databaseClient';
import { HttpStatus } from '../enums';
import axios from 'axios';

const DPO_BASE_URL = 'https://secure.3gdirectpay.com/API/v6/';

const handleInitiatePayment = expressAsyncHandler(async (req: Request, res: Response) => {
  const initiatePaymentPayload = z.object({
    reference: z.string(),
    amount: z.number(),
    currency: z.enum(['UGX', 'USD']),
  });

  const { reference, amount, currency } = initiatePaymentPayload.parse(req.body);

  const { customerEmail, customerPhone } = req.body;

  const xmlBody = `
      <API3G>
        <CompanyToken>YOUR_COMPANY_TOKEN</CompanyToken>
        <Request>createToken</Request>
        <Transaction>
          <PaymentAmount>${amount}</PaymentAmount>
          <PaymentCurrency>UGX</PaymentCurrency>
          <CompanyRef>${reference}</CompanyRef>
          <RedirectURL>https://yourapp.com/payment-success</RedirectURL>
          <BackURL>https://yourserver.com/api/dpo/callback</BackURL>
          <customerEmail>${customerEmail}</customerEmail>
          <customerPhone>${customerPhone}</customerPhone>
        </Transaction>
      </API3G>

      <?xml version="1.0" encoding="utf-8"?>
      <API3G>
        <CompanyToken>57466282-EBD7-4ED5-B699-8659330A6996</CompanyToken>
        <Request>createToken</Request>
        <Transaction>
          <PaymentAmount>${amount}</PaymentAmount>
          <PaymentCurrency>${currency}</PaymentCurrency>
          <CompanyRef>49FKEOA</CompanyRef>
          <RedirectURL>http://www.domain.com/payurl.php</RedirectURL>
          <BackURL>http://www.domain.com/backurl.php </BackURL>
          <CompanyRefUnique>0</CompanyRefUnique>
          <PTL>5</PTL>
        </Transaction>
        <Services>
          <Service>
            <ServiceType>45</ServiceType>
            <ServiceDescription>Flight from Nairobi to Diani</ServiceDescription>
            <ServiceDate>2013/12/20 19:00</ServiceDate>
          </Service>
        </Services>
      </API3G>
    `;

  const response = await axios.post(DPO_BASE_URL, xmlBody, {
    headers: { 'Content-Type': 'application/xml' },
  });

  // Parse the XML response to extract the token
  const token = response.data.match(/<TransToken>(.*?)<\/TransToken>/)?.[1];
});

const handleVerifyPayment = expressAsyncHandler(async (req: Request, res: Response) => {
  const token = '';

  const xmlBody = `
    <API3G>
      <CompanyToken>YOUR_COMPANY_TOKEN</CompanyToken>
      <Request>verifyToken</Request>
      <TransactionToken>${token}</TransactionToken>
    </API3G>
  `;

  await axios.post(DPO_BASE_URL, xmlBody, {
    headers: { 'Content-Type': 'application/xml' },
  });
});

const handleCallback = expressAsyncHandler(async (req: Request, res: Response) => {});
