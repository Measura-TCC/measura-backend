import { Module } from '@nestjs/common';
import { ReportsController } from '@controllers/fpa/reports.controller';
import { EstimatesController } from '@controllers/fpa/estimates.controller';
import { DocumentsController } from '@controllers/fpa/documents.controller';
import { FPAModule } from '@app/modules/fpa/fpa.module';
import { EstimatesComponentsModule } from '@controllers/fpa/estimates-components.module';

@Module({
  imports: [FPAModule, EstimatesComponentsModule],
  controllers: [ReportsController, EstimatesController, DocumentsController],
})
export class EstimatesModule {}
