import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MeasurementPlan,
  MeasurementPlanSchema,
} from '@domain/measurement-plans/entities/measurement-plan.entity';
import {
  MeasurementCycle,
  MeasurementCycleSchema,
} from '@domain/measurement-plans/entities/measurement-cycle.entity';
import {
  MeasurementData,
  MeasurementDataSchema,
} from '@domain/measurement-plans/entities/measurement-data.entity';
import { MEASUREMENT_PLAN_REPOSITORY } from '@domain/measurement-plans/interfaces/measurement-plan.repository.interface';
import { MeasurementPlanRepository } from '@infrastructure/repositories/measurement-plans/measurement-plan.repository';
import { MeasurementCycleRepository } from '@infrastructure/repositories/measurement-plans/measurement-cycle.repository';
import { MeasurementDataRepository } from '@infrastructure/repositories/measurement-plans/measurement-data.repository';
import { MeasurementPlanService } from '@application/measurement-plans/use-cases/measurement-plan.service';
import { ExportService } from '@application/measurement-plans/use-cases/export.service';
import { CycleService } from '@application/measurement-plans/use-cases/cycle.service';
import { MeasurementDataService } from '@application/measurement-plans/use-cases/measurement-data.service';
import { StatusService } from '@application/measurement-plans/use-cases/status.service';
import { MeasurementPlansController } from '@controllers/measurement-plans/measurement-plans.controller';
import { MeasurementPlansExportController } from '@controllers/measurement-plans/export.controller';
import { CyclesController } from '@controllers/measurement-plans/cycles.controller';
import { ProjectsModule } from '@modules/projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MeasurementPlan.name,
        schema: MeasurementPlanSchema,
      },
      {
        name: MeasurementCycle.name,
        schema: MeasurementCycleSchema,
      },
      {
        name: MeasurementData.name,
        schema: MeasurementDataSchema,
      },
    ]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [
    MeasurementPlansController,
    MeasurementPlansExportController,
    CyclesController,
  ],
  providers: [
    {
      provide: MEASUREMENT_PLAN_REPOSITORY,
      useClass: MeasurementPlanRepository,
    },
    MeasurementPlanRepository,
    MeasurementPlanService,
    ExportService,
    MeasurementCycleRepository,
    MeasurementDataRepository,
    CycleService,
    MeasurementDataService,
    StatusService,
  ],
  exports: [
    MeasurementPlanService,
    MEASUREMENT_PLAN_REPOSITORY,
    MeasurementPlanRepository,
    CycleService,
    MeasurementDataService,
    StatusService,
  ],
})
export class MeasurementPlansModule {}
