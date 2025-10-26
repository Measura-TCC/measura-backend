import { ApiProperty } from '@nestjs/swagger';
import { Requirement } from '@domain/fpa/entities/requirement.entity';

export class SkippedItemDto {
  @ApiProperty({ description: 'Item identifier that was skipped' })
  key: string;

  @ApiProperty({ description: 'Reason why item was skipped' })
  reason: string;
}

export class ImportResultResponseDto {
  @ApiProperty({ description: 'Whether import was successful' })
  success: boolean;

  @ApiProperty({ description: 'Import statistics and results', type: Object })
  data: {
    imported: number;
    skipped: number;
    failed: number;
    requirements: Requirement[];
    skippedItems?: SkippedItemDto[];
  };
}
