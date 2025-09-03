import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const date = new Date().toISOString().split('T')[0];
const logFile = path.join(logsDir, `backend-${date}.log`);

// Create a file stream for Pino (append mode)
const fileStream = fs.createWriteStream(logFile, { flags: 'a', encoding: 'utf8' });

// Base logger options
const baseOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  // Best-effort redaction of common sensitive fields in structured logs
  redact: {
    paths: [
      // Request headers
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]', // bracket notation for hyphenated key
      // Response headers (frameworks often attach this shape)
      'res.headers["set-cookie"]',
      // Some libs use `response` instead of `res`
      'response.headers["set-cookie"]',

      // Bodies / params
      'req.body.password',
      'req.body.token',
      'req.body.key',
      'req.query.key',
      'query.key',
      'body.key',
    ],
    censor: '[REDACTED]',
  },
};

// Use multistream so we log to console AND file without monkey-patching stdout
const logger = pino(
  baseOptions,
  pino.multistream([
    { stream: process.stdout }, // console
    { stream: fileStream },     // file
  ])
);

export default logger;
