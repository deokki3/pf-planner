import path from 'node:path';
import fs from 'node:fs';
import { format, transports, createLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
// ensure directory exists
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const isProd = process.env.NODE_ENV === 'production';

const consoleFmt = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const msg = stack ? `${message}\n${stack}` : message;
    return `[${timestamp}] ${level}: ${msg}${rest}`;
  })
);

const fileFmt = format.combine(
  format.timestamp(),
  format.json()
);

const fileRotate = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'           // keep 14 days
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: fileFmt,          // default for file transports
  transports: [
    fileRotate,
    new transports.File({
      dirname: LOG_DIR,
      filename: 'errors.log',
      level: 'error'
    })
  ]
});

// pretty console in dev
if (!isProd) {
  logger.add(new transports.Console({ format: consoleFmt }));
}
type LogMeta = Record<string, unknown>;
// Helpful wrappers
export const log = {
    info: (msg: string, meta?: LogMeta) => logger.info(msg, meta),
    warn: (msg: string, meta?: LogMeta) => logger.warn(msg, meta),
    error: (msg: string | Error, meta?: LogMeta) => {
      if (msg instanceof Error) {
        logger.error(msg.message, { stack: msg.stack, ...meta });
      } else {
        logger.error(msg, meta);
      }
    },
    debug: (msg: string, meta?: LogMeta) => logger.debug(msg, meta),
  };