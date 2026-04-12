'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter,
  Button,
  Input,
  Label,
} from '@/components/ui';
import type { Employee, EmployeeRole, EmployeeStatus, CreateEmployeeInput } from '@/features/employees';

interface EmployeeFormProps {
  /** Existing employee for editing, or undefined for create */
  employee?: Employee;
}

// Icons as components
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

/**
 * Form for creating or editing an employee.
 */
export function EmployeeForm({ employee }: EmployeeFormProps) {
  const router = useRouter();
  const isEdit = !!employee;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState(employee?.full_name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [role, setRole] = useState<EmployeeRole>(employee?.role || 'rider');
  const [status, setStatus] = useState<EmployeeStatus>(employee?.status || 'pending');
  const [hireDate, setHireDate] = useState(employee?.hire_date || '');
  const [terminationDate, setTerminationDate] = useState(employee?.termination_date || '');
  
  // Login credentials
  const hasExistingLogin = !!employee?.user_id;
  const [enableLogin, setEnableLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Password reset for existing login
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Auto-fill login email when enabling login
  function handleEnableLoginChange(enabled: boolean) {
    setEnableLogin(enabled);
    if (enabled && !loginEmail && email) {
      setLoginEmail(email);
    }
  }

  // Send password reset email
  async function handleSendResetEmail() {
    if (!employee?.user_id || !email) return;
    
    setResettingPassword(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/employees/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: employee.user_id,
          action: 'send_email',
          email: email,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send reset email');
      }
      
      setSuccessMessage('Password reset email sent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setResettingPassword(false);
    }
  }

  // Set password directly
  async function handleSetPassword() {
    if (!employee?.user_id || !newPassword) return;
    
    setResettingPassword(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/employees/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: employee.user_id,
          action: 'set_password',
          newPassword: newPassword,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set password');
      }
      
      setSuccessMessage('Password updated successfully. Please share the new password with the employee.');
      setNewPassword('');
      setShowResetPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const data = {
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        role,
        status,
        hire_date: hireDate || null,
        termination_date: terminationDate || null,
      };

      let employeeId: string | null = null;

      if (isEdit) {
        const { error } = await supabase
          .from('employees')
          .update(data)
          .eq('id', employee.id);

        if (error) throw error;
        employeeId = employee.id;
      } else {
        const { data: newEmployee, error } = await supabase
          .from('employees')
          .insert(data)
          .select('id')
          .single();

        if (error) throw error;
        employeeId = newEmployee.id;
      }

      // Create login credentials if enabled (new employees or existing without login)
      if (!hasExistingLogin && enableLogin && loginEmail && loginPassword) {
        const loginResponse = await fetch('/api/employees/create-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            loginEmail,
            password: loginPassword,
            fullName,
          }),
        });

        if (!loginResponse.ok) {
          const loginError = await loginResponse.json();
          throw new Error(loginError.error || 'Failed to create login credentials');
        }
      }

      router.push('/dashboard/employees');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {/* Personal Information */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <p className="text-sm text-muted">Basic contact details for the employee</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName" required>Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card className="mb-6">
        <CardHeader className="border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <BriefcaseIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Employment Details</CardTitle>
              <p className="text-sm text-muted">Role, status, and hire information</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" required>Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as EmployeeRole)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="rider">Rider</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" required>Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-heading transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="past">Past</option>
              </select>
            </div>

            {/* Hire Date */}
            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>

            {/* Termination Date */}
            <div className="space-y-2">
              <Label htmlFor="terminationDate">Termination Date</Label>
              <Input
                id="terminationDate"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
              <p className="text-xs text-muted">Leave empty for current employees</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Credentials - Show if employee doesn't have login yet */}
      {!hasExistingLogin ? (
        <Card className="mb-6">
          <CardHeader className="border-b border-border bg-background-subtle">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <KeyIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Login Credentials</CardTitle>
                <p className="text-sm text-muted">Optional: Allow this employee to log in to the system</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Enable Login Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableLogin}
                  onChange={(e) => handleEnableLoginChange(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-heading">Enable login access for this employee</span>
              </label>

              {enableLogin && (
                <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-border">
                  {/* Login Email */}
                  <div className="space-y-2">
                    <Label htmlFor="loginEmail" required>Login Email</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="employee@company.com"
                      required={enableLogin}
                    />
                    <p className="text-xs text-muted">This will be their username to log in</p>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="loginPassword" required>Password</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      minLength={6}
                      required={enableLogin}
                    />
                    <p className="text-xs text-muted">They can change this after logging in</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader className="border-b border-border bg-background-subtle">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <KeyIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Login Credentials</CardTitle>
                <p className="text-sm text-muted">This employee already has login access</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p className="text-sm text-body">
                This employee has an active login account. You can reset their password below.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendResetEmail}
                  disabled={resettingPassword || !email}
                  loading={resettingPassword}
                >
                  Send Password Reset Email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  disabled={resettingPassword}
                >
                  {showResetPassword ? 'Cancel' : 'Set Password Directly'}
                </Button>
              </div>

              {!email && (
                <p className="text-xs text-amber-600">
                  Add an email address in Personal Information to send password reset emails.
                </p>
              )}

              {showResetPassword && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" required>New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleSetPassword}
                        disabled={resettingPassword || newPassword.length < 6}
                        loading={resettingPassword}
                      >
                        Update Password
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    After setting the password, share it with the employee so they can log in.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
}
