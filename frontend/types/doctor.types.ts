export interface Specialization {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface DoctorUserSummary {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string | null;
}

export interface Doctor {
  id: string;
  user: DoctorUserSummary;
  hospital: string;
  branch: string;
  branch_name: string | null;
  department: string | null;
  department_name: string | null;
  specializations: Specialization[];
  license_number: string;
  qualification: string;
  experience_years: number;
  consultation_fee: string;
  consultation_duration_minutes: number;
  bio: string;
  languages_spoken: string;
  is_available_for_appointments: boolean;
  created_at: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DoctorAvailability {
  id: string;
  doctor: string;
  branch: string;
  day_of_week: DayOfWeek;
  day_of_week_display: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface DoctorTimeOff {
  id: string;
  doctor: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
}
