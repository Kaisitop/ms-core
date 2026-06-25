import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @MessagePattern('analytics.heatMap')
  getHeatMap(@Payload() payload?: { dias?: number }) {
    return this.analyticsService.getHeatMap(payload?.dias ?? 30);
  }
}
