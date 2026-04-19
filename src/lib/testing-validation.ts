/**
 * Testing & Validation Utilities (T-109 to T-110)
 * 
 * Provides:
 * - Validation helpers
 * - Test utilities
 * - Mock data generators
 * - Schema validation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationRule<T = unknown> {
  validate: (value: T, field: string) => ValidationError | null;
}

export type Validator<T> = (value: T) => ValidationResult;

export interface SchemaDefinition {
  [field: string]: {
    type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'uuid' | 'array' | 'object';
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: unknown[];
    custom?: ValidationRule;
    items?: SchemaDefinition;
    properties?: SchemaDefinition;
  };
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const rules = {
  required: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (value === undefined || value === null || value === '') {
        return { field, message: `${field} is required`, code: 'required' };
      }
      return null;
    },
  }),

  string: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return { field, message: `${field} must be a string`, code: 'type', value };
      }
      return null;
    },
  }),

  number: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (value !== undefined && value !== null && typeof value !== 'number') {
        return { field, message: `${field} must be a number`, code: 'type', value };
      }
      return null;
    },
  }),

  boolean: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (value !== undefined && value !== null && typeof value !== 'boolean') {
        return { field, message: `${field} must be a boolean`, code: 'type', value };
      }
      return null;
    },
  }),

  min: (minValue: number): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'number' && value < minValue) {
        return { field, message: `${field} must be at least ${minValue}`, code: 'min', value };
      }
      return null;
    },
  }),

  max: (maxValue: number): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'number' && value > maxValue) {
        return { field, message: `${field} must be at most ${maxValue}`, code: 'max', value };
      }
      return null;
    },
  }),

  minLength: (minLen: number): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'string' && value.length < minLen) {
        return { field, message: `${field} must be at least ${minLen} characters`, code: 'minLength', value };
      }
      return null;
    },
  }),

  maxLength: (maxLen: number): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'string' && value.length > maxLen) {
        return { field, message: `${field} must be at most ${maxLen} characters`, code: 'maxLength', value };
      }
      return null;
    },
  }),

  email: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { field, message: `${field} must be a valid email`, code: 'email', value };
      }
      return null;
    },
  }),

  phone: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'string' && !/^\+?[\d\s-()]{10,}$/.test(value)) {
        return { field, message: `${field} must be a valid phone number`, code: 'phone', value };
      }
      return null;
    },
  }),

  uuid: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        return { field, message: `${field} must be a valid UUID`, code: 'uuid', value };
      }
      return null;
    },
  }),

  date: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'string' && isNaN(Date.parse(value))) {
        return { field, message: `${field} must be a valid date`, code: 'date', value };
      }
      return null;
    },
  }),

  pattern: (regex: RegExp, message?: string): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (typeof value === 'string' && !regex.test(value)) {
        return { field, message: message || `${field} format is invalid`, code: 'pattern', value };
      }
      return null;
    },
  }),

  oneOf: <T>(values: T[]): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (value !== undefined && !values.includes(value as T)) {
        return { field, message: `${field} must be one of: ${values.join(', ')}`, code: 'enum', value };
      }
      return null;
    },
  }),

  array: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (value !== undefined && !Array.isArray(value)) {
        return { field, message: `${field} must be an array`, code: 'type', value };
      }
      return null;
    },
  }),

  object: (): ValidationRule<unknown> => ({
    validate: (value, field) => {
      if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
        return { field, message: `${field} must be an object`, code: 'type', value };
      }
      return null;
    },
  }),
};

// ============================================================================
// VALIDATOR BUILDER
// ============================================================================

/**
 * Create a validator from rules.
 */
export function createValidator<T extends Record<string, unknown>>(
  schema: Record<keyof T, ValidationRule[]>
): Validator<T> {
  return (data: T): ValidationResult => {
    const errors: ValidationError[] = [];

    for (const [field, fieldRules] of Object.entries(schema)) {
      const value = data[field as keyof T];

      for (const rule of fieldRules as ValidationRule[]) {
        const error = rule.validate(value, field);
        if (error) {
          errors.push(error);
          break; // Stop at first error for this field
        }
      }
    }

    return { valid: errors.length === 0, errors };
  };
}

/**
 * Validate against schema definition.
 */
export function validateSchema(
  data: Record<string, unknown>,
  schema: SchemaDefinition
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [field, def] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (def.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} is required`, code: 'required' });
      continue;
    }

    if (value === undefined || value === null) continue;

    // Type checks
    switch (def.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({ field, message: `${field} must be a string`, code: 'type', value });
        } else {
          if (def.minLength && value.length < def.minLength) {
            errors.push({ field, message: `${field} must be at least ${def.minLength} characters`, code: 'minLength', value });
          }
          if (def.maxLength && value.length > def.maxLength) {
            errors.push({ field, message: `${field} must be at most ${def.maxLength} characters`, code: 'maxLength', value });
          }
          if (def.pattern && !def.pattern.test(value)) {
            errors.push({ field, message: `${field} format is invalid`, code: 'pattern', value });
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number') {
          errors.push({ field, message: `${field} must be a number`, code: 'type', value });
        } else {
          if (def.min !== undefined && value < def.min) {
            errors.push({ field, message: `${field} must be at least ${def.min}`, code: 'min', value });
          }
          if (def.max !== undefined && value > def.max) {
            errors.push({ field, message: `${field} must be at most ${def.max}`, code: 'max', value });
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({ field, message: `${field} must be a boolean`, code: 'type', value });
        }
        break;

      case 'date':
        if (isNaN(Date.parse(String(value)))) {
          errors.push({ field, message: `${field} must be a valid date`, code: 'date', value });
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          errors.push({ field, message: `${field} must be a valid email`, code: 'email', value });
        }
        break;

      case 'phone':
        if (!/^\+?[\d\s-()]{10,}$/.test(String(value))) {
          errors.push({ field, message: `${field} must be a valid phone number`, code: 'phone', value });
        }
        break;

      case 'uuid':
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))) {
          errors.push({ field, message: `${field} must be a valid UUID`, code: 'uuid', value });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({ field, message: `${field} must be an array`, code: 'type', value });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({ field, message: `${field} must be an object`, code: 'type', value });
        }
        break;
    }

    // Enum check
    if (def.enum && !def.enum.includes(value)) {
      errors.push({ field, message: `${field} must be one of: ${def.enum.join(', ')}`, code: 'enum', value });
    }

    // Custom validation
    if (def.custom) {
      const customError = def.custom.validate(value, field);
      if (customError) errors.push(customError);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const validators = {
  employee: createValidator({
    full_name: [rules.required(), rules.string(), rules.minLength(2), rules.maxLength(100)],
    email: [rules.required(), rules.string(), rules.email()],
    phone: [rules.string(), rules.phone()],
    role: [rules.required(), rules.oneOf(['rider', 'supervisor', 'admin', 'hr'])],
    status: [rules.oneOf(['active', 'inactive', 'suspended'])],
  }),

  order: createValidator({
    tracking_number: [rules.string(), rules.minLength(3), rules.maxLength(50)],
    status: [rules.required(), rules.oneOf(['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'])],
    pickup_address: [rules.required(), rules.string(), rules.minLength(5)],
    delivery_address: [rules.required(), rules.string(), rules.minLength(5)],
    customer_name: [rules.required(), rules.string()],
    customer_phone: [rules.string(), rules.phone()],
  }),

  asset: createValidator({
    name: [rules.required(), rules.string(), rules.minLength(2), rules.maxLength(100)],
    type: [rules.required(), rules.oneOf(['vehicle', 'device', 'equipment', 'uniform'])],
    status: [rules.oneOf(['available', 'assigned', 'maintenance', 'retired'])],
    serial_number: [rules.string()],
  }),

  leave: createValidator({
    leave_type: [rules.required(), rules.oneOf(['annual', 'sick', 'personal', 'unpaid', 'maternity', 'paternity'])],
    start_date: [rules.required(), rules.date()],
    end_date: [rules.required(), rules.date()],
    reason: [rules.string(), rules.maxLength(500)],
  }),

  invoice: createValidator({
    invoice_number: [rules.string()],
    client_id: [rules.required(), rules.uuid()],
    due_date: [rules.required(), rules.date()],
    total_amount: [rules.required(), rules.number(), rules.min(0)],
    status: [rules.oneOf(['draft', 'sent', 'paid', 'overdue', 'cancelled'])],
  }),
};

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

let mockIdCounter = 1;

export const mockGenerators = {
  id: () => `mock-${mockIdCounter++}`,
  
  uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  }),

  email: (name?: string) => {
    const base = name?.toLowerCase().replace(/\s+/g, '.') || `user${mockIdCounter}`;
    return `${base}@example.com`;
  },

  phone: () => `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,

  date: (daysFromNow = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  },

  datetime: (daysFromNow = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
  },

  number: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,

  decimal: (min = 0, max = 100, decimals = 2) => {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
  },

  boolean: () => Math.random() > 0.5,

  pick: <T>(options: T[]): T => options[Math.floor(Math.random() * options.length)],

  firstName: () => mockGenerators.pick(['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa']),
  
  lastName: () => mockGenerators.pick(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']),

  fullName: () => `${mockGenerators.firstName()} ${mockGenerators.lastName()}`,

  address: () => `${mockGenerators.number(100, 9999)} ${mockGenerators.pick(['Main', 'Oak', 'Elm', 'Park', 'Cedar'])} ${mockGenerators.pick(['St', 'Ave', 'Blvd', 'Rd'])}`,

  city: () => mockGenerators.pick(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia']),

  trackingNumber: () => `TRK${Date.now().toString(36).toUpperCase()}${mockGenerators.number(100, 999)}`,

  employee: (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: mockGenerators.uuid(),
    full_name: mockGenerators.fullName(),
    email: mockGenerators.email(),
    phone: mockGenerators.phone(),
    role: mockGenerators.pick(['rider', 'supervisor', 'admin']),
    status: 'active',
    hire_date: mockGenerators.date(-365),
    created_at: mockGenerators.datetime(-30),
    updated_at: mockGenerators.datetime(),
    ...overrides,
  }),

  order: (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: mockGenerators.uuid(),
    tracking_number: mockGenerators.trackingNumber(),
    status: mockGenerators.pick(['pending', 'assigned', 'in_transit', 'delivered']),
    pickup_address: mockGenerators.address(),
    delivery_address: mockGenerators.address(),
    customer_name: mockGenerators.fullName(),
    customer_phone: mockGenerators.phone(),
    created_at: mockGenerators.datetime(-7),
    updated_at: mockGenerators.datetime(),
    ...overrides,
  }),

  asset: (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: mockGenerators.uuid(),
    name: `Asset ${mockGenerators.number(1, 100)}`,
    type: mockGenerators.pick(['vehicle', 'device', 'equipment']),
    status: mockGenerators.pick(['available', 'assigned', 'maintenance']),
    serial_number: `SN${mockGenerators.number(10000, 99999)}`,
    purchase_date: mockGenerators.date(-365),
    created_at: mockGenerators.datetime(-60),
    ...overrides,
  }),

  invoice: (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: mockGenerators.uuid(),
    invoice_number: `INV-${mockGenerators.number(1000, 9999)}`,
    client_id: mockGenerators.uuid(),
    total_amount: mockGenerators.decimal(100, 10000),
    status: mockGenerators.pick(['draft', 'sent', 'paid']),
    due_date: mockGenerators.date(30),
    created_at: mockGenerators.datetime(-7),
    ...overrides,
  }),
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

export interface TestContext {
  organizationId: string;
  userId: string;
  role: string;
}

/**
 * Create test context.
 */
export function createTestContext(overrides: Partial<TestContext> = {}): TestContext {
  return {
    organizationId: mockGenerators.uuid(),
    userId: mockGenerators.uuid(),
    role: 'admin',
    ...overrides,
  };
}

/**
 * Create mock Supabase response.
 */
export function mockSupabaseResponse<T>(
  data: T | null,
  error: { message: string; code?: string } | null = null
) {
  return Promise.resolve({
    data,
    error,
    count: Array.isArray(data) ? data.length : null,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK',
  });
}

/**
 * Create mock paginated response.
 */
export function mockPaginatedResponse<T>(
  items: T[],
  page = 1,
  pageSize = 20,
  total?: number
) {
  const totalItems = total ?? items.length;
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  return {
    data: paginatedItems,
    meta: {
      page,
      pageSize,
      total: totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Assertion helpers.
 */
export const assertions = {
  isValidUuid: (value: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  },

  isValidEmail: (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  isValidDate: (value: string): boolean => {
    return !isNaN(Date.parse(value));
  },

  isWithinRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  hasRequiredFields: <T extends Record<string, unknown>>(obj: T, fields: (keyof T)[]): boolean => {
    return fields.every(field => obj[field] !== undefined && obj[field] !== null);
  },

  matchesSchema: (obj: Record<string, unknown>, schema: SchemaDefinition): boolean => {
    return validateSchema(obj, schema).valid;
  },
};

/**
 * Wait for condition with timeout.
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Retry function with backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// SANITIZATION
// ============================================================================

export const sanitizers = {
  trim: (value: string): string => value?.trim() ?? '',
  
  lowercase: (value: string): string => value?.toLowerCase() ?? '',
  
  uppercase: (value: string): string => value?.toUpperCase() ?? '',
  
  removeHtml: (value: string): string => value?.replace(/<[^>]*>/g, '') ?? '',
  
  escapeHtml: (value: string): string => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return value?.replace(/[&<>"']/g, char => escapeMap[char]) ?? '';
  },
  
  normalizePhone: (value: string): string => {
    return value?.replace(/[^\d+]/g, '') ?? '';
  },
  
  normalizeEmail: (value: string): string => {
    return value?.toLowerCase().trim() ?? '';
  },
  
  slug: (value: string): string => {
    return value
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ?? '';
  },
};

/**
 * Sanitize object fields.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  sanitizationMap: Partial<Record<keyof T, (value: unknown) => unknown>>
): T {
  const result = { ...obj };

  for (const [field, sanitizer] of Object.entries(sanitizationMap)) {
    if (field in result && sanitizer) {
      (result as Record<string, unknown>)[field] = sanitizer(result[field as keyof T]);
    }
  }

  return result;
}
