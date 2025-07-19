import {
  TransactionStatus,
  WalletTransactionCategory,
  WalletTransactionDescription,
} from "@/enums";
import { throwUnprocessableEntityError } from "@/helpers";
import {
  IWallet,
  IWalletTransaction,
  Wallet,
  WalletTransaction,
} from "@/models";
import mongoose, { Connection, Model, Types } from "mongoose";

export class WalletService {
  private static instance: WalletService;

  private readonly walletModel: Model<IWallet> = Wallet;
  private readonly walletTransactionModel: Model<IWalletTransaction> =
    WalletTransaction;

  private readonly connection: Connection;

  constructor() {
    this.connection = mongoose.connection;
  }

  static getInstance(): WalletService {
    if (!this.instance) {
      this.instance = new WalletService();
    }
    return this.instance;
  }

  async canDeductBalance(userId: string, amount?: number) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.isLocked) {
      return throwUnprocessableEntityError("Wallet is not active");
    }

    if (!wallet || wallet.balance < (amount ?? 50)) {
      return throwUnprocessableEntityError("Insufficient token");
    }

    return wallet.balance >= (amount ?? 0);
  }

  async getOrCreateWallet(userId: string) {
    let data = await this.walletModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
      },
      { userId },
      { upsert: true, new: true }
    );

    return data;
  }

  async createWallet(userId: string) {
    return await this.walletModel.create({ userId });
  }

  async lockWallet(userId: string) {
    return await this.walletModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { isLocked: true },
      {
        upsert: true,
        new: true,
      }
    );
  }

  async unlockWallet(userId: string) {
    return await this.walletModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { isLocked: false },
      {
        upsert: true,
        new: true,
      }
    );
  }

  async deductToken(
    category: WalletTransactionCategory,
    amount: number,
    reference: string,
    userId: string,
    description: WalletTransactionDescription,
    tokenLogId?: string,
    conversationId?: string
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.balance < amount) {
      throwUnprocessableEntityError("Insufficient balance");
    }

    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      await this.walletModel.findByIdAndUpdate(wallet._id, {
        $inc: {
          balance: -amount,
        },
      });

      await this.walletTransactionModel.create({
        amount: amount,
        businessId: userId,
        walletId: wallet._id,
        type: "debit",
        status: TransactionStatus.SUCCESS,
        reference,
        category,
        description,
        tokenLogId,
        conversationId,
      });
    } catch (error) {
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  }
}
