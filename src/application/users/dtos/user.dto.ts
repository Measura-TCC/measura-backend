import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '@domain/users/entities/user.entity';

export class UserDto {
  @ApiProperty({ description: 'Unique identifier for the user' })
  id: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
  })
  role: UserRole;

  @ApiProperty({ description: 'Whether the user email is verified' })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Whether the user has completed the onboarding tour',
  })
  hasCompletedOnboarding: boolean;

  @ApiProperty({ description: 'User creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'User last update date' })
  updatedAt: Date;

  static fromEntity(user: User): UserDto {
    if (!user) {
      throw new Error('User entity is required');
    }

    const dto = new UserDto();
    dto.id = user._id ? user._id.toString() : '';
    dto.email = user.email || '';
    dto.role = user.role || UserRole.USER;
    dto.isEmailVerified = !!user.isEmailVerified;
    dto.hasCompletedOnboarding = !!user.hasCompletedOnboarding;
    dto.createdAt = user.createdAt || new Date();
    dto.updatedAt = user.updatedAt || new Date();
    return dto;
  }
}
