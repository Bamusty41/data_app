import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { UserStatus } from '../types/enums';

export interface CreateUserInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  transaction_pin: string;
  virtual_account_number?: string;
  virtual_bank_name?: string;
  virtual_account_name?: string;
}

export class UserService {
  private static SALT_ROUNDS = 10;

  /**
   * Registers a new user and automatically initializes their wallet.
   */
  static async createUser(input: CreateUserInput) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { phone: input.phone }],
      },
    });

    if (existingUser) {
      if (existingUser.email === input.email) {
        throw new Error('User with this email already exists');
      }
      throw new Error('User with this phone number already exists');
    }

    const password_hash = await bcrypt.hash(input.password, this.SALT_ROUNDS);
    const transaction_pin_hash = await bcrypt.hash(input.transaction_pin, this.SALT_ROUNDS);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          full_name: input.full_name,
          email: input.email.toLowerCase(),
          phone: input.phone,
          password_hash,
          transaction_pin_hash,
          biometric_enabled: false,
          status: UserStatus.ACTIVE,
        },
      });

      const wallet = await tx.wallet.create({
        data: {
          user_id: user.id,
          balance: 0.00,
          virtual_account_number: input.virtual_account_number || null,
          virtual_bank_name: input.virtual_bank_name || null,
          virtual_account_name: input.virtual_account_name || null,
        },
      });

      return { user, wallet };
    });
  }

  /**
   * Validates a user's transaction PIN.
   */
  static async verifyTransactionPin(userId: string, pin: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('User account is suspended');
    }

    return bcrypt.compare(pin, user.transaction_pin_hash);
  }

  /**
   * Ensures the user is active and exists.
   */
  static async ensureUserActive(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('User account is currently suspended');
    }
    return user;
  }

  /**
   * Updates user biometric status.
   */
  static async setBiometricStatus(userId: string, enabled: boolean) {
    await this.ensureUserActive(userId);
    return prisma.user.update({
      where: { id: userId },
      data: { biometric_enabled: enabled },
    });
  }

  /**
   * Updates user account status (ACTIVE/SUSPENDED).
   */
  static async updateUserStatus(userId: string, status: UserStatus) {
    return prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  /**
   * Gets user by ID with wallet included.
   */
  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
  }
}
