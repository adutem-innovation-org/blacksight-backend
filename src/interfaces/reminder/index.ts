import { ReminderChannels, ReminderStatus, ReminderTypes } from "@/enums";
import { IAppointment, IBusinessCustomerPayment, IReminder } from "@/models";

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReminderFilters {
  status?: ReminderStatus | ReminderStatus[];
  type?: ReminderTypes | ReminderTypes[];
  channel?: ReminderChannels | ReminderChannels[];
  tag?: string;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ReminderAnalytics {
  total: number;
  active: number;
  completed: number;
  failed: number;
  byType: Record<ReminderTypes, number>;
  byChannel: Record<ReminderChannels, number>;
  byStatus: Record<ReminderStatus, number>;
  successRate: number;
  recentActivity: {
    sent: number;
    failed: number;
    period: string;
  };
}

export interface ReminderContext {
  reminder: IReminder;
  identifier: string; // email or phone
  identifierType: "email" | "phone";
}

export interface CustomerDataResult {
  customerData: IBusinessCustomerPayment | IAppointment | null;
  derivedData: Record<string, any>;
  updatedData: Record<string, any>;
}
