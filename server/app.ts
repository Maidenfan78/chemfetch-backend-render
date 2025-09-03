// server/app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

// ?? add .js on all relative imports
import sdsByNameRoute from './routes/sdsByName.js';
import batchSdsRoute from './routes/batchSds.js';
import logger from './utils/logger.js';
import scanRoute from './routes/scan.js';
import manualScanRoute from './routes/manualScan.js';
import sdsTriggerRoute from './routes/sdsTrigger.js';
import confirmRoute from './routes/confirm.js';
import healthRoute from './routes/health.js';
import verifySdsProxy from './routes/verifySds.js';
import parseSDSEnhancedRoute from './routes/parseSDSEnhanced.js';
import parseSdsRoute from './routes/parseSds.js';

dotenv.config();

const app = express();

// Tight CORS origin gate (runs before other handlers in production)
function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  const o = origin.trim().toLowerCase();
  for (const entry of allowed) {
    const e = entry.trim().toLowerCase();
    if (!e) continue;
    if (e === 'https://*.vercel.app') {
      if (o.endsWith('.vercel.app') && (o.startsWith('https://') || o.startsWith('http://'))) return true;
      continue;
    }
    if (o === e) return true;
  }
  return false;
}

if (process.env.NODE_ENV === 'production') {
  const envList = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const defaults = [
    'https://chemfetch.com',
    'https://www.chemfetch.com',
    'https://*.vercel.app',
  ];
  const allowedOrigins = [...envList, ...defaults];

  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (!origin) return next(); // non-browser
    if (isAllowedOrigin(origin, allowedOrigins)) return next();
    return res.status(403).send('Not allowed by CORS');
  });
}

// Keep CORS middleware (will succeed if the gate passed)
const corsOptions = {
  origin: (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Basic permissive handler; production restrictions applied in the gate above
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use('/sds-by-name', sdsByNameRoute);

// ?? Fix: pino-http callable typing under ESM/NodeNext
const pinoHttpFactory = pinoHttp as unknown as (opts?: {
  logger?: any;
}) => import('pino-http').HttpLogger;
app.use(pinoHttpFactory({ logger }));

const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(limiter);

// Security headers .
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use('/scan', scanRoute);
app.use('/manual-scan', manualScanRoute);
app.use('/sds-trigger', sdsTriggerRoute);
app.use('/confirm', confirmRoute);
app.use('/health', healthRoute);
app.use('/verify-sds', verifySdsProxy);
app.use('/parse-sds', parseSdsRoute);
app.use('/parse-sds-enhanced', parseSDSEnhancedRoute);
app.use('/batch-sds', batchSdsRoute);

export default app;

