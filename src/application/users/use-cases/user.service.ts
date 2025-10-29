import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  USER_REPOSITORY,
  IUserRepository,
} from '@domain/users/interfaces/user.repository.interface';
import {
  User,
  UserRole,
  AuthProvider,
} from '@domain/users/entities/user.entity';
import { CreateUserDto } from '@application/users/dtos/create-user.dto';
import { UpdateUserDto } from '@application/users/dtos/update-user.dto';
import {
  ORGANIZATION_INVITATION_REPOSITORY,
  IOrganizationInvitationRepository,
} from '@domain/organization-invitations/interfaces/organization-invitation.repository.interface';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ORGANIZATION_INVITATION_REPOSITORY)
    private readonly invitationRepository: IOrganizationInvitationRepository,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingEmail = await this.userRepository.findByEmail(
      createUserDto.email,
    );
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.userRepository.findByUsername(
      createUserDto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    let hashedPassword: string | undefined;
    if (createUserDto.password) {
      hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    }

    const newUser = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      provider: createUserDto.provider || AuthProvider.LOCAL,
      role: createUserDto.role || UserRole.USER,
      isActive: true,
    });

    return newUser;
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto | any): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.userRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingEmail && existingEmail._id.toString() !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.userRepository.findByUsername(
        updateUserDto.username,
      );
      if (existingUsername && existingUsername._id.toString() !== id) {
        throw new ConflictException('Username already exists');
      }
    }

    // Hash password if it's being updated
    let dataToUpdate = { ...updateUserDto };
    if (updateUserDto.password) {
      dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userRepository.update(id, dataToUpdate);

    if (!updatedUser) {
      throw new NotFoundException(`Failed to update user with ID "${id}"`);
    }

    return updatedUser;
  }

  async remove(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const result = await this.userRepository.delete(id);
    if (!result) {
      throw new BadRequestException(`Failed to delete user with ID "${id}"`);
    }

    return true;
  }

  /**
   * Change password with current password verification (secure)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Users with OAuth providers cannot change passwords
    if (!user.password) {
      throw new BadRequestException(
        'Password changes are not available for OAuth accounts',
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updatedUser = await this.userRepository.update(userId, {
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new NotFoundException(`Failed to update password for user "${userId}"`);
    }

    return updatedUser;
  }

  /**
   * Reset password without current password verification (admin only)
   */
  async resetPassword(
    adminUserId: string,
    targetUserId: string,
    newPassword: string,
  ): Promise<User> {
    // Verify admin has permission
    const admin = await this.userRepository.findById(adminUserId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can reset passwords');
    }

    // Find target user
    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updatedUser = await this.userRepository.update(targetUserId, {
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new NotFoundException(
        `Failed to reset password for user "${targetUserId}"`,
      );
    }

    return updatedUser;
  }

  async leaveOrganization(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (!user.organizationId) {
      throw new BadRequestException('You are not part of any organization');
    }

    const updatedUser = await this.userRepository.update(userId, {
      $unset: { organizationId: 1 },
    } as any);

    if (!updatedUser) {
      throw new BadRequestException('Failed to leave organization');
    }

    const pendingInvitations =
      await this.invitationRepository.findPendingByUserId(userId);

    for (const invitation of pendingInvitations) {
      await this.invitationRepository.update(invitation._id.toString(), {
        status: 'CANCELLED' as any,
      });
    }
  }
}
