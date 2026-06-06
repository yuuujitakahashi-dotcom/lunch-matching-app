export type Participant = {
  id: string;
  anonymous_id: string;
  nickname: string;
  available_days: string[];
  created_at: string;
  updated_at: string;
};

export type Registration = {
  id: string;
  anonymous_id: string;
  lunch_date: string;
  status: "registered" | "cancelled";
  registered_at: string;
  cancelled_at: string | null;
};

export type LunchGroup = {
  id: string;
  lunch_date: string;
  member_ids: string[];
  nicknames: string[];
  status: "pending" | "confirmed" | "cancelled";
  confirmed_at: string | null;
  notified_at: string | null;
};

export type DayStatus = {
  date: string;
  dayLabel: string;
  participantCount: number;
  isRegistered: boolean;
  groups: LunchGroup[];
  isConfirmed: boolean;
};
