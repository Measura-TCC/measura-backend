import { ApiProperty } from '@nestjs/swagger';

export class TestConnectionResponseDto {
  @ApiProperty({ description: 'Whether connection test was successful' })
  success: boolean;

  @ApiProperty({ description: 'Connection test result message' })
  message: string;

  @ApiProperty({ description: 'Additional connection details', required: false, type: Object })
  details?: Record<string, any>;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Whether request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Error details', type: Object })
  error: {
    code: string;
    message: string;
    details?: string;
  };
}
