import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { UserStatus } from '../types/enums';

export class UserController {
  static async register(req: Request, res: Response) {
    try {
      const { full_name, email, phone, password, transaction_pin, virtual_account_number, virtual_bank_name, virtual_account_name } = req.body;

      if (!full_name || !email || !phone || !password || !transaction_pin) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await UserService.createUser({
        full_name,
        email,
        phone,
        password,
        transaction_pin,
        virtual_account_number,
        virtual_bank_name,
        virtual_account_name,
      });

      return res.status(201).json({
        message: 'User registered successfully',
        data: {
          id: result.user.id,
          full_name: result.user.full_name,
          email: result.user.email,
          phone: result.user.phone,
          status: result.user.status,
          wallet: result.wallet,
        },
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ data: user });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(UserStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid user status' });
      }

      const updated = await UserService.updateUserStatus(id, status as UserStatus);
      return res.json({ message: `User status updated to ${status}`, data: updated });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
