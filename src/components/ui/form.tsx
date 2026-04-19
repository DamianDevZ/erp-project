'use client';

import * as React from 'react';
import {
  useForm,
  FormProvider,
  useFormContext,
  Controller,
  type UseFormReturn,
  type FieldValues,
  type FieldPath,
  type ControllerRenderProps,
  type SubmitHandler,
  type DefaultValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Form System - Built on react-hook-form + zod for type-safe validation.
 * 
 * @example
 * const schema = z.object({
 *   name: z.string().min(1, 'Name is required'),
 *   email: z.string().email('Invalid email'),
 *   status: z.enum(['active', 'inactive']),
 * });
 * 
 * <Form schema={schema} defaultValues={{ name: '', email: '', status: 'active' }} onSubmit={handleSubmit}>
 *   <FormField name="name" label="Name" required />
 *   <FormField name="email" label="Email" type="email" required />
 *   <FormSelect name="status" label="Status" options={statusOptions} />
 *   <FormActions submitLabel="Save" onCancel={() => router.back()} />
 * </Form>
 */

// ============================================================================
// FORM WRAPPER
// ============================================================================

interface FormProps<T extends FieldValues> {
  /** Zod schema for validation */
  schema: z.ZodSchema<T>;
  /** Default form values */
  defaultValues: DefaultValues<T>;
  /** Submit handler */
  onSubmit: SubmitHandler<T>;
  /** Children (form fields) */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Form ID */
  id?: string;
}

export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className = '',
  id,
}: FormProps<T>) {
  const methods = useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues,
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={methods.handleSubmit(onSubmit)}
        className={`space-y-6 ${className}`}
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
}

// ============================================================================
// FORM FIELD (TEXT INPUT)
// ============================================================================

interface FormFieldProps {
  /** Field name (must match schema) */
  name: string;
  /** Field label */
  label: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local';
  /** Placeholder text */
  placeholder?: string;
  /** Required field */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Help text */
  description?: string;
  /** Additional class name */
  className?: string;
  /** Auto focus */
  autoFocus?: boolean;
}

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  description,
  className = '',
  autoFocus = false,
}: FormFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-heading mb-1.5">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        {...register(name, { valueAsNumber: type === 'number' })}
        className={`
          flex h-10 w-full rounded-md border bg-input px-3 py-2 text-sm text-heading
          placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-error focus:ring-error' : 'border-border focus:ring-primary'}
        `}
      />
      {description && !error && (
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      )}
      {error && (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// FORM TEXTAREA
// ============================================================================

interface FormTextareaProps {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  rows?: number;
  className?: string;
}

export function FormTextarea({
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  description,
  rows = 4,
  className = '',
}: FormTextareaProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-heading mb-1.5">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <textarea
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        {...register(name)}
        className={`
          flex w-full rounded-md border bg-input px-3 py-2 text-sm text-heading
          placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50 resize-none
          ${error ? 'border-error focus:ring-error' : 'border-border focus:ring-primary'}
        `}
      />
      {description && !error && (
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      )}
      {error && (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// FORM SELECT
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  description?: string;
  className?: string;
}

export function FormSelect({
  name,
  label,
  options,
  placeholder = 'Select...',
  required = false,
  disabled = false,
  description,
  className = '',
}: FormSelectProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-heading mb-1.5">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <select
        id={name}
        disabled={disabled}
        {...register(name)}
        className={`
          flex h-10 w-full rounded-md border bg-input px-3 py-2 text-sm text-heading
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${error ? 'border-error focus:ring-error' : 'border-border focus:ring-primary'}
        `}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {description && !error && (
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      )}
      {error && (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// FORM CHECKBOX
// ============================================================================

interface FormCheckboxProps {
  name: string;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function FormCheckbox({
  name,
  label,
  description,
  disabled = false,
  className = '',
}: FormCheckboxProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          disabled={disabled}
          {...register(name)}
          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <div>
          <span className="text-sm font-medium text-heading">{label}</span>
          {description && (
            <p className="text-sm text-muted">{description}</p>
          )}
        </div>
      </label>
      {error && (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// FORM RADIO GROUP
// ============================================================================

interface FormRadioGroupProps {
  name: string;
  label: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  description?: string;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export function FormRadioGroup({
  name,
  label,
  options,
  required = false,
  disabled = false,
  description,
  className = '',
  direction = 'vertical',
}: FormRadioGroupProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-heading mb-2">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      <div className={`flex ${direction === 'vertical' ? 'flex-col gap-2' : 'flex-wrap gap-4'}`}>
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2">
            <input
              type="radio"
              value={opt.value}
              disabled={disabled || opt.disabled}
              {...register(name)}
              className="h-4 w-4 border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-body">{opt.label}</span>
          </label>
        ))}
      </div>
      {description && !error && (
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      )}
      {error && (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// FORM SECTION (for grouping fields)
// ============================================================================

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className = '',
}: FormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-heading">{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// ============================================================================
// FORM ACTIONS (submit/cancel buttons)
// ============================================================================

interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Align buttons */
  align?: 'left' | 'right' | 'between';
}

export function FormActions({
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  loading = false,
  disabled = false,
  className = '',
  align = 'right',
}: FormActionsProps) {
  const alignClass = {
    left: 'justify-start',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center gap-3 pt-4 border-t border-border ${alignClass[align]} ${className}`}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-body rounded-md border border-border hover:bg-hover transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        disabled={loading || disabled}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <LoadingSpinner />}
        {submitLabel}
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ============================================================================
// FORM ROW (for inline fields)
// ============================================================================

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FormRow({ children, className = '' }: FormRowProps) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>{children}</div>
  );
}

// ============================================================================
// HOOK FOR ACCESSING FORM STATE
// ============================================================================

export function useFormState() {
  const {
    formState: { errors, isSubmitting, isDirty, isValid },
    reset,
    watch,
    setValue,
    getValues,
  } = useFormContext();

  return {
    errors,
    isSubmitting,
    isDirty,
    isValid,
    reset,
    watch,
    setValue,
    getValues,
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { useForm, useFormContext, Controller };
export type { UseFormReturn, FieldValues, FieldPath, ControllerRenderProps };
