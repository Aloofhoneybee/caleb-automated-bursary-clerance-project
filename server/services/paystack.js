const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const paystackAPI = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Initialize a payment transaction
const initializeTransaction = async ({ email, amount, reference, metadata, callbackUrl }) => {
  const response = await paystackAPI.post('/transaction/initialize', {
    email,
    amount: amount * 100, // Paystack works in kobo
    reference,
    metadata,
    callback_url: callbackUrl || `${process.env.CLIENT_URL}/payment/verify`,
  });
  return response.data;
};

// Verify a transaction by reference
const verifyTransaction = async (reference) => {
  const response = await paystackAPI.get(`/transaction/verify/${reference}`);
  return response.data;
};

module.exports = { initializeTransaction, verifyTransaction };