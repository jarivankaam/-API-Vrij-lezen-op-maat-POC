import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { BooksModule } from './books/books.module.js';
import { UsersModule } from './users/users.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { UsersController } from './users/users.controller.js';
import { BooksController } from './books/books.controller.js';
import {RecommendationsController} from './recommendations/recommendations.controller.js';
import { UsersService } from './users/users.service.js';
import { BooksService } from './books/books.service.js';
import { RecommendationsService } from './recommendations/recommendations.service.js';


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
    BooksModule,
    UsersModule,
    RecommendationsModule,
  ],
  controllers: [UsersController, BooksController, RecommendationsController],
  providers: [UsersService, BooksService, RecommendationsService],
})
export class AppModule {}
