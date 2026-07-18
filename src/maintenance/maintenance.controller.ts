import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MaintenanceService } from './maintenance.service';

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @MessagePattern('maintenance.purgeAppData')
  purgeAppData(@Payload() payload?: { requestedBy?: string }) {
    return this.maintenanceService.purgeAppData(payload?.requestedBy);
  }
}
