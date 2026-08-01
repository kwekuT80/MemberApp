export interface WelfareCategory {
  id: string;
  name: string;
  description?: string | null;
  default_amount: number;
  is_active: boolean;
  commandery_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WelfareContribution {
  id: string;
  member_id: string;
  amount: number;
  payment_date: string;
  period_year: number;
  period_month?: number | null;
  payment_method: 'cash' | 'mobile_money' | 'bank_transfer' | 'cheque';
  reference_no?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  commandery_id?: string | null;
  created_at?: string;
  members?: {
    first_name: string;
    surname: string;
    title?: string;
    id_number?: string;
  };
  profiles?: {
    email: string;
  };
}

export interface WelfareDisbursement {
  id: string;
  member_id: string;
  category_id?: string | null;
  category_name: string;
  amount: number;
  disbursement_date: string;
  payment_method: 'mobile_money' | 'bank_transfer' | 'cash' | 'cheque';
  reference_no?: string | null;
  notes?: string | null;
  disbursed_by?: string | null;
  commandery_id?: string | null;
  created_at?: string;
  members?: {
    first_name: string;
    surname: string;
    title?: string;
  };
  profiles?: {
    email: string;
  };
}

export interface WelfareAuditEntry {
  id: string;
  action: 'contribution_add' | 'contribution_edit' | 'contribution_delete' | 'disbursement_add' | 'disbursement_edit' | 'disbursement_delete' | 'category_change' | 'rate_change';
  entity_type: 'welfare_contribution' | 'welfare_disbursement' | 'welfare_category' | 'welfare_rate';
  entity_id: string;
  member_id?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  changed_by?: string | null;
  changed_at: string;
  members?: {
    first_name: string;
    surname: string;
  };
  profiles?: {
    email: string;
  };
}

export interface WelfareSummary {
  totalContributions: number;
  totalDisbursements: number;
  netFundBalance: number;
  contributionsThisYear: number;
  disbursementsThisYear: number;
  contributingMembersCount: number;
  inactiveMembersCount: number;
  totalMembersCount: number;
  activeCategoriesCount: number;
}

export interface WelfareContributionRate {
  id: string;
  year: number;
  monthly_rate: number;
  notes?: string | null;
  set_by?: string | null;
  commandery_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
