import { Request, Response } from 'express';
import { AdminService } from '../../services/adminService';
import { UserStatus } from '../../types/enums';

export const UserAdminController = {
  async search(req: Request, res: Response) {
    try {
      const filter = {
        search: req.query.search as string | undefined,
        status: req.query.status as UserStatus | undefined,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      };
      const result = await AdminService.searchUsers(filter);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const result = await AdminService.getUserDetail(userId);
      return res.json({ data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },

  async adjustBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { type, amount, reason } = req.body;

      if (!type || !['CREDIT', 'DEBIT'].includes(type)) {
        return res.status(400).json({ error: 'type must be CREDIT or DEBIT' });
      }
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount must be greater than zero' });
      }
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Compulsory admin reason is required for manual adjustment' });
      }

      const result = await AdminService.adjustUserBalance(userId, type, Number(amount), reason);
      return res.json({ message: 'User balance adjusted successfully', data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      if (!status || !Object.values(UserStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid user status' });
      }
      const result = await AdminService.updateUserStatus(userId, status as UserStatus);
      return res.json({ message: `User status updated to ${status}`, data: result });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  },
};
