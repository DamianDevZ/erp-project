/**
 * Employee types and interfaces.
 */

/** Employee status — their current employment state */
export type EmployeeStatus = 'pending' | 'active' | 'past';

/** Employee role — what they do in the field */
export type EmployeeRole = 'rider' | 'supervisor' | 'manager' | 'hr';

/**
 * Employee entity as stored in the database.
 */
export interface Employee {
  id: string;
  organization_id: string;
  employee_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  hire_date: string | null;
  termination_date: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new employee.
 */
export interface CreateEmployeeInput {
  full_name: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  role?: EmployeeRole;
  hire_date?: string;
}

/**
 * Input for updating an existing employee.
 */
export interface UpdateEmployeeInput {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  hire_date?: string;
  termination_date?: string;
}

/**
 * Employee with related counts/data.
 */
export interface EmployeeWithRelations extends Employee {
  assignments_count?: number;
  documents_count?: number;
  assigned_asset?: {
    id: string;
    name: string;
  } | null;
}
