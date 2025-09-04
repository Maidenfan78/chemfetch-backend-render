// server/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import sdsByNameRoute from '../routes/sdsByName.js';

import logger from './logger.js';

import scanRoute from '../routes/scan.js';
import confirmRoute from '../routes/confirm.js';
import healthRoute from '../routes/health.js';
import ocrProxy from '../routes/ocrProxy.js'; // <— NEW
import verifySdsProxy from '../routes/verifySds.js'; // <— NEW

dotenv.config();

const app = express();

// Configure strict CORS from FRONTEND_URL (CSV of allowed origins)
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no Origin header (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true); // permissive if not configured
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use('/sds-by-name', sdsByNameRoute);

// --- Fix pino-http typing under ESM/NodeNext ---
const pinoHttpFactory = pinoHttp as unknown as (opts?: {
  logger?: any;
}) => import('pino-http').HttpLogger;

app.use(pinoHttpFactory({ logger }));
// -----------------------------------------------

const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(limiter);

app.use('/scan', scanRoute);
app.use('/confirm', confirmRoute);
app.use('/health', healthRoute);
app.use('/ocr', ocrProxy); // <— NEW
app.use('/verify-sds', verifySdsProxy); // <— NEW

export default app;
