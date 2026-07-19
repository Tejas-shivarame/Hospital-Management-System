export interface Hospital {
  id: string;
  name: string;
  slug: string;
  registration_number: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  logo: string | null;
  is_active: boolean;
  subscription_plan: "trial" | "basic" | "pro" | "enterprise";
  branch_count: number;
  created_at: string;
}

export interface Branch {
  id: string;
  hospital: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  is_main_branch: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  hospital: string;
  branch: string;
  name: string;
  code: string;
  description: string;
  head_of_department: string | null;
  head_of_department_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
