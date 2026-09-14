import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import { BooksModule } from './books/books.module.js';
import { UsersModule } from './users/users.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: '-API-Vrij-lezen-op-maat-POC',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/vrij-lezen-op-maat',
    ),
    PrismaModule,
    BooksModule,
    UsersModule,
    RecommendationsModule,
  ],
})
export class AppModule {}
