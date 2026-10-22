import { Request, Response } from 'express';
import { Router } from 'express';
import { resetPassword } from './resetPassService';

export const resetPassController = async (req: Request, res: Response) => {
    const { email, newPassword } = req.body;
    try {
        await resetPassword(email, newPassword);
        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Password reset failed', error });
    }
};

export const resetPassRouter = Router();
resetPassRouter.post('/reset-password', resetPassController);
