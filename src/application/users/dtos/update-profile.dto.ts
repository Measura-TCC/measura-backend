import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  IsBoolean,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'The username of the user',
    example: 'johndoe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores and hyphens',
  })
  username?: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({
    description: 'Whether the user has completed the onboarding tour',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'hasCompletedOnboarding must be a boolean' })
  hasCompletedOnboarding?: boolean;
}
