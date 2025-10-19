import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  IsMongoId,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '@domain/users/entities/user.entity';
import { Types } from 'mongoose';

export class UpdateUserDto {
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
    description: 'The role of the user',
    enum: UserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role?: UserRole;

  @ApiProperty({
    description: 'Whether the user is active',
    required: false,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'The organization ID this user belongs to',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'Organization ID must be a valid MongoDB ObjectId' })
  organizationId?: Types.ObjectId;

  @ApiProperty({
    description: 'Whether the user has completed the onboarding tour',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'hasCompletedOnboarding must be a boolean' })
  hasCompletedOnboarding?: boolean;
}
