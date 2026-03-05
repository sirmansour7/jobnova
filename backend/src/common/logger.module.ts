import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: isDev
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                winston.format.printf(
                  ({ timestamp, level, message, ...meta }) => {
                    const extra = Object.keys(meta).length
                      ? ' ' + JSON.stringify(meta)
                      : '';
                    return `${timestamp} [${level}] ${message}${extra}`;
                  },
                ),
              )
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              ),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
