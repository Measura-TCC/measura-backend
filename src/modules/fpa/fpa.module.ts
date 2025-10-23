import { Module, Logger, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ALI, ALISchema } from '@domain/fpa/entities/ali.entity';
import { AIE, AIESchema } from '@domain/fpa/entities/aie.entity';
import { EI, EISchema } from '@domain/fpa/entities/ei.entity';
import { EO, EOSchema } from '@domain/fpa/entities/eo.entity';
import { EQ, EQSchema } from '@domain/fpa/entities/eq.entity';
import { Estimate, EstimateSchema } from '@domain/fpa/entities/estimate.entity';
import {
  DocumentEntity,
  DocumentEntitySchema,
} from '@domain/fpa/entities/document.entity';
import {
  Requirement,
  RequirementSchema,
} from '@domain/fpa/entities/requirement.entity';

import { ALIRepository } from '@infrastructure/repositories/fpa/ali.repository';
import { AIERepository } from '@infrastructure/repositories/fpa/aie.repository';
import { EIRepository } from '@infrastructure/repositories/fpa/ei.repository';
import { EORepository } from '@infrastructure/repositories/fpa/eo.repository';
import { EQRepository } from '@infrastructure/repositories/fpa/eq.repository';
import { EstimateRepository } from '@infrastructure/repositories/fpa/estimate.repository';
import { DocumentRepository } from '@infrastructure/repositories/fpa/document.repository';
import { RequirementRepository } from '@infrastructure/repositories/fpa/requirement.repository';

import { ALI_REPOSITORY } from '@domain/fpa/interfaces/ali.repository.interface';
import { AIE_REPOSITORY } from '@domain/fpa/interfaces/aie.repository.interface';
import { EI_REPOSITORY } from '@domain/fpa/interfaces/ei.repository.interface';
import { EO_REPOSITORY } from '@domain/fpa/interfaces/eo.repository.interface';
import { EQ_REPOSITORY } from '@domain/fpa/interfaces/eq.repository.interface';
import { ESTIMATE_REPOSITORY } from '@domain/fpa/interfaces/estimate.repository.interface';
import { DOCUMENT_REPOSITORY } from '@domain/fpa/interfaces/document.repository.interface';
import { REQUIREMENT_REPOSITORY } from '@domain/fpa/interfaces/requirement.repository.interface';

import { ComplexityCalculator } from '@domain/fpa/services/complexity-calculator.service';
import { FunctionPointCalculator } from '@domain/fpa/services/function-point-calculator.service';
import { TrendAnalysisService } from '@domain/fpa/services/trend-analysis.service';
import { TeamSizeEstimationService } from '@domain/fpa/services/team-size-estimation.service';
import { ReportGeneratorService } from '@domain/fpa/services/report-generator.service';
import { DocumentService } from '@domain/fpa/services/document.service';
import { EstimateDocumentService } from '@domain/fpa/services/estimate-document.service';
import { EstimateService } from '@application/fpa/use-cases/estimate.service';
import { RequirementService } from '@application/fpa/use-cases/requirement.service';
import { ProjectsModule } from '@modules/projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ALI.name, schema: ALISchema },
      { name: AIE.name, schema: AIESchema },
      { name: EI.name, schema: EISchema },
      { name: EO.name, schema: EOSchema },
      { name: EQ.name, schema: EQSchema },
      { name: Estimate.name, schema: EstimateSchema },
      { name: DocumentEntity.name, schema: DocumentEntitySchema },
      { name: Requirement.name, schema: RequirementSchema },
    ]),
    forwardRef(() => ProjectsModule),
  ],
  providers: [
    Logger,
    {
      provide: ALI_REPOSITORY,
      useClass: ALIRepository,
    },
    {
      provide: AIE_REPOSITORY,
      useClass: AIERepository,
    },
    {
      provide: EI_REPOSITORY,
      useClass: EIRepository,
    },
    {
      provide: EO_REPOSITORY,
      useClass: EORepository,
    },
    {
      provide: EQ_REPOSITORY,
      useClass: EQRepository,
    },
    {
      provide: ESTIMATE_REPOSITORY,
      useClass: EstimateRepository,
    },
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: DocumentRepository,
    },
    {
      provide: REQUIREMENT_REPOSITORY,
      useClass: RequirementRepository,
    },
    EstimateRepository,
    ComplexityCalculator,
    FunctionPointCalculator,
    TrendAnalysisService,
    TeamSizeEstimationService,
    ReportGeneratorService,
    DocumentService,
    EstimateDocumentService,
    EstimateService,
    RequirementService,
  ],
  exports: [
    ALI_REPOSITORY,
    AIE_REPOSITORY,
    EI_REPOSITORY,
    EO_REPOSITORY,
    EQ_REPOSITORY,
    ESTIMATE_REPOSITORY,
    EstimateRepository,
    DOCUMENT_REPOSITORY,
    REQUIREMENT_REPOSITORY,
    ComplexityCalculator,
    FunctionPointCalculator,
    TrendAnalysisService,
    TeamSizeEstimationService,
    ReportGeneratorService,
    DocumentService,
    EstimateDocumentService,
    EstimateService,
    RequirementService,
  ],
})
export class FPAModule {}
