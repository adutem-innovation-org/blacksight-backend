import { ReminderChannels, ReminderStatus, ReminderTypes } from "@/enums";

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
