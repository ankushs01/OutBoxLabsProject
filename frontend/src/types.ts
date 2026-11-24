export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
}

export type EmailStatus = "scheduled" | "sent" | "failed";
export type Folder = "scheduled" | "sent";

export interface EmailRow {
  id: string;
  to: string;
  subject: string;
  body: string;
  fromEmail: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  previewUrl?: string | null;
  error?: string | null;
}

export interface Sender {
  id: number;
  email: string;
}

export interface Counts {
  scheduled: number;
  sent: number;
}

export interface SlackStatus {
  connected: boolean;
  team_name?: string;
  channel?: string;
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delaySeconds: number;
  hourlyLimit?: number;
  senderId?: number;
}
