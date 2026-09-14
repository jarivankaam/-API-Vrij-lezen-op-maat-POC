import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecommendationDto } from './dto/create-recommendation.dto.js';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto.js';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createRecommendationDto: CreateRecommendationDto) {
    return this.prisma.recommendation.create({ data: createRecommendationDto });
  }

  findAll() {
    return this.prisma.recommendation.findMany();
  }

  findOne(id: number) {
    return this.prisma.recommendation.findUnique({ where: { id } });
  }

  update(id: number, updateRecommendationDto: UpdateRecommendationDto) {
    return this.prisma.recommendation.update({ where: { id }, data: updateRecommendationDto });
  }

  remove(id: number) {
    return this.prisma.recommendation.delete({ where: { id } });
  }
}
