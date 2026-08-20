export type Avatar = {
  url?: string | null;
  letters?: string | null;
  bg?: string | null;
};

export type User = {
  _id: string;
  name: string;
  email: string;
  avatar?: Avatar | null;
};

export type GroupSummary = {
  _id: string;
  code: string;
  name: string;
  icon?: string | null;
  currency?: string;
  memberCount?: number;
  myPermission?: string | null;
  myMembershipId?: string | null;
};

export type GroupMember = {
  _id: string;
  userId?: string | null;
  displayName?: string | null;
  email?: string | null;
  permission?: string;
  avatar?: Avatar | null;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    avatar?: Avatar | null;
  } | null;
};

export type GroupDetail = GroupSummary & {
  members?: GroupMember[];
  settings?: {
    defaultSplitMethod?: string;
    defaultSplitConfig?: { memberId: string; value: number }[] | null;
    simplifyDebts?: boolean;
  };
};

export type Transfer = {
  _id: string;
  title: string;
  icon?: string | null;
  amountMinor: number;
  currency?: string;
  fromMemberId: string;
  toMemberId: string;
  transferDate?: string;
  createdAt?: string;
  createdById?: string;
};

export type Expense = {
  _id: string;
  title: string;
  description?: string | null;
  amountMinor: number;
  currency?: string;
  icon?: string | null;
  categoryKey?: string | null;
  splitMethod?: string;
  expenseDate?: string;
  createdAt?: string;
  createdById?: string;
  version?: number;
  payers?: { memberId: string; amountMinor: number }[];
  participants?: { memberId: string; included?: boolean }[];
  splits?: { memberId: string; amountMinor: number; inputValue?: number | null }[];
};

export type BalanceMember = {
  _id: string;
  userId?: string | null;
  displayName?: string | null;
  netMinor: number;
  paidMinor?: number;
  owedMinor?: number;
};

export type Pairwise = {
  from: string;
  to: string;
  amountMinor: number;
  fromName?: string;
  toName?: string;
};

export type GroupBalance = {
  currency?: string;
  members?: BalanceMember[];
  pairwise?: Pairwise[];
  summary?: {
    totalExpenseMinor?: number;
    unsettledMinor?: number;
  };
};

export type ApiError = {
  message?: string;
  code?: string;
} | null;
