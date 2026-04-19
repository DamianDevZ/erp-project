'use server';

/**
 * API Endpoints Service (T-106 to T-108)
 * 
 * Manages:
 * - REST API route handlers
 * - Request/Response utilities
 * - API authentication
 * - Rate limiting
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ApiError[];
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  requestId?: string;
  timestamp?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiContext {
  userId: string;
  organizationId: string;
  role: string;
  apiKeyId?: string;
  requestId: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create success response.
 */
export function successResponse<T>(
  data: T,
  meta?: ApiMeta,
  status: number = HTTP_STATUS.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Create paginated response.
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; pageSize: number; total: number }
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  return NextResponse.json({
    success: true,
    data,
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Create error response.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = HTTP_STATUS.BAD_REQUEST,
  errors?: ApiError[]
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errors: errors || [{ code, message }],
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Validation error response.
 */
export function validationErrorResponse(
  errors: Array<{ field: string; message: string }>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      errors: errors.map(e => ({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: e.message,
        field: e.field,
      })),
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: HTTP_STATUS.UNPROCESSABLE }
  );
}

/**
 * Not found response.
 */
export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ERROR_CODES.NOT_FOUND,
    `${resource} not found`,
    HTTP_STATUS.NOT_FOUND
  );
}

/**
 * Unauthorized response.
 */
export function unauthorizedResponse(
  message: string = 'Authentication required'
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ERROR_CODES.UNAUTHORIZED,
    message,
    HTTP_STATUS.UNAUTHORIZED
  );
}

/**
 * Forbidden response.
 */
export function forbiddenResponse(
  message: string = 'Permission denied'
): NextResponse<ApiResponse<never>> {
  return errorResponse(
    ERROR_CODES.FORBIDDEN,
    message,
    HTTP_STATUS.FORBIDDEN
  );
}

// ============================================================================
// REQUEST PARSING
// ============================================================================

/**
 * Parse pagination from request.
 */
export function parsePagination(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams;
  
  let page = parseInt(searchParams.get('page') || '1', 10);
  let pageSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
  
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;
  
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  return { page, pageSize, sortBy, sortOrder };
}

/**
 * Parse filters from request.
 */
export function parseFilters(
  request: NextRequest,
  allowedFields: string[]
): Record<string, string> {
  const searchParams = request.nextUrl.searchParams;
  const filters: Record<string, string> = {};
  
  for (const [key, value] of searchParams.entries()) {
    if (allowedFields.includes(key) && value) {
      filters[key] = value;
    }
  }
  
  return filters;
}

/**
 * Parse JSON body safely.
 */
export async function parseBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Get path parameter.
 */
export function getPathParam(
  request: NextRequest,
  paramName: string
): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  
  // This is a simplified version - in real Next.js,
  // use the params from the route handler
  const paramIndex = segments.indexOf(paramName);
  if (paramIndex !== -1 && paramIndex + 1 < segments.length) {
    return segments[paramIndex + 1];
  }
  
  return null;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Authenticate API request.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ success: true; context: ApiContext } | { success: false; response: NextResponse }> {
  // Check for API key first
  const apiKey = request.headers.get('X-API-Key');
  
  if (apiKey) {
    const keyResult = await validateApiKey(apiKey);
    if (keyResult.success && keyResult.context) {
      return { success: true, context: keyResult.context };
    }
    return { success: false, response: unauthorizedResponse('Invalid API key') };
  }
  
  // Check for session auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, response: unauthorizedResponse() };
  }
  
  // Get organization from header or default
  const organizationId = request.headers.get('X-Organization-Id') || '';
  
  if (!organizationId) {
    return { 
      success: false, 
      response: errorResponse(
        ERROR_CODES.BAD_REQUEST,
        'Organization ID required',
        HTTP_STATUS.BAD_REQUEST
      )
    };
  }
  
  // Verify organization membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single();
  
  if (!membership) {
    return { success: false, response: forbiddenResponse('Not a member of this organization') };
  }
  
  return {
    success: true,
    context: {
      userId: user.id,
      organizationId,
      role: membership.role,
      requestId: crypto.randomUUID(),
    },
  };
}

/**
 * Validate API key.
 */
async function validateApiKey(
  key: string
): Promise<{ success: boolean; context?: ApiContext }> {
  const supabase = await createClient();
  
  // Hash the key for lookup
  const keyHash = await hashApiKey(key);
  
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('id, organization_id, user_id, scopes, expires_at, is_active')
    .eq('key_hash', keyHash)
    .single();
  
  if (!apiKey || !apiKey.is_active) {
    return { success: false };
  }
  
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { success: false };
  }
  
  // Update last used
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);
  
  return {
    success: true,
    context: {
      userId: apiKey.user_id,
      organizationId: apiKey.organization_id,
      role: 'api',
      apiKeyId: apiKey.id,
      requestId: crypto.randomUUID(),
    },
  };
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }
  
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Rate limit middleware.
 */
export async function withRateLimit(
  request: NextRequest,
  context: ApiContext,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  const key = `${context.organizationId}:${context.userId}`;
  const result = checkRateLimit(key, config);
  
  if (!result.allowed) {
    const response = errorResponse(
      ERROR_CODES.RATE_LIMITED,
      'Too many requests',
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
    
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', String(result.resetAt));
    
    return response;
  }
  
  return null;
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check API permission.
 */
export async function checkApiPermission(
  context: ApiContext,
  resource: string,
  action: string
): Promise<boolean> {
  // Super admin can do anything
  if (context.role === 'owner' || context.role === 'super_admin') {
    return true;
  }
  
  // Check role permissions
  const supabase = await createClient();
  
  const { data: role } = await supabase
    .from('roles')
    .select('permissions')
    .eq('name', context.role)
    .single();
  
  if (!role?.permissions) {
    return false;
  }
  
  const permissions = role.permissions as Array<{ resource: string; actions: string[] }>;
  
  return permissions.some(p => 
    p.resource === resource && p.actions.includes(action)
  );
}

/**
 * Require permission middleware.
 */
export async function requirePermission(
  context: ApiContext,
  resource: string,
  action: string
): Promise<NextResponse | null> {
  const hasPermission = await checkApiPermission(context, resource, action);
  
  if (!hasPermission) {
    return forbiddenResponse(`Permission denied: ${resource}:${action}`);
  }
  
  return null;
}

// ============================================================================
// API HANDLER WRAPPER
// ============================================================================

export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse<ApiResponse<T>>>;

interface ApiHandlerOptions {
  requireAuth?: boolean;
  permission?: { resource: string; action: string };
  rateLimit?: RateLimitConfig;
}

/**
 * Wrap API handler with middleware.
 */
export function createApiHandler<T>(
  handler: ApiHandler<T>,
  options: ApiHandlerOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const requestId = crypto.randomUUID();
    
    try {
      // Auth
      let context: ApiContext = {
        userId: '',
        organizationId: '',
        role: '',
        requestId,
      };
      
      if (options.requireAuth !== false) {
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
          return authResult.response;
        }
        context = authResult.context;
      }
      
      // Rate limiting
      if (options.rateLimit && context.userId) {
        const rateLimitResponse = await withRateLimit(request, context, options.rateLimit);
        if (rateLimitResponse) return rateLimitResponse;
      }
      
      // Permission check
      if (options.permission) {
        const permissionResponse = await requirePermission(
          context,
          options.permission.resource,
          options.permission.action
        );
        if (permissionResponse) return permissionResponse;
      }
      
      // Call handler
      const response = await handler(request, context);
      
      // Add request ID header
      response.headers.set('X-Request-Id', requestId);
      
      return response;
    } catch (error) {
      console.error('API Error:', error);
      
      const response = errorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred',
        HTTP_STATUS.INTERNAL_ERROR
      );
      
      response.headers.set('X-Request-Id', requestId);
      
      return response;
    }
  };
}

// ============================================================================
// CRUD HELPERS
// ============================================================================

/**
 * Create list handler.
 */
export function createListHandler<T>(
  table: string,
  options: {
    allowedFilters?: string[];
    defaultSort?: string;
    transform?: (row: Record<string, unknown>) => T;
  } = {}
): ApiHandler<T[]> {
  return async (request, context) => {
    const supabase = await createClient();
    const pagination = parsePagination(request);
    const filters = parseFilters(request, options.allowedFilters || []);
    
    let query = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .eq('organization_id', context.organizationId);
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    
    // Apply sorting
    const sortBy = pagination.sortBy || options.defaultSort || 'created_at';
    query = query.order(sortBy, { ascending: pagination.sortOrder === 'asc' });
    
    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    query = query.range(from, from + pagination.pageSize - 1);
    
    const { data, count, error } = await query;
    
    if (error) {
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, HTTP_STATUS.INTERNAL_ERROR);
    }
    
    const transformedData = options.transform
      ? (data || []).map(options.transform)
      : (data || []) as T[];
    
    return paginatedResponse(transformedData, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: count || 0,
    });
  };
}

/**
 * Create get handler.
 */
export function createGetHandler<T>(
  table: string,
  options: {
    transform?: (row: Record<string, unknown>) => T;
  } = {}
): (id: string) => ApiHandler<T> {
  return (id: string) => async (_request, context) => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (error || !data) {
      return notFoundResponse();
    }
    
    const transformed = options.transform ? options.transform(data) : data as T;
    
    return successResponse(transformed);
  };
}

/**
 * Create create handler.
 */
export function createCreateHandler<T, Input>(
  table: string,
  options: {
    validate?: (input: Input) => Array<{ field: string; message: string }>;
    transform?: (input: Input, context: ApiContext) => Record<string, unknown>;
    responseTransform?: (row: Record<string, unknown>) => T;
  } = {}
): ApiHandler<T> {
  return async (request, context) => {
    const body = await parseBody<Input>(request);
    
    if (!body) {
      return errorResponse(ERROR_CODES.BAD_REQUEST, 'Invalid request body', HTTP_STATUS.BAD_REQUEST);
    }
    
    // Validate
    if (options.validate) {
      const errors = options.validate(body);
      if (errors.length > 0) {
        return validationErrorResponse(errors);
      }
    }
    
    const supabase = await createClient();
    
    const insertData = options.transform
      ? options.transform(body, context)
      : {
          ...body,
          organization_id: context.organizationId,
          created_by: context.userId,
        };
    
    const { data, error } = await supabase
      .from(table)
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, HTTP_STATUS.INTERNAL_ERROR);
    }
    
    const transformed = options.responseTransform ? options.responseTransform(data) : data as T;
    
    return successResponse(transformed, undefined, HTTP_STATUS.CREATED);
  };
}

/**
 * Create update handler.
 */
export function createUpdateHandler<T, Input>(
  table: string,
  options: {
    validate?: (input: Partial<Input>) => Array<{ field: string; message: string }>;
    transform?: (input: Partial<Input>, context: ApiContext) => Record<string, unknown>;
    responseTransform?: (row: Record<string, unknown>) => T;
  } = {}
): (id: string) => ApiHandler<T> {
  return (id: string) => async (request, context) => {
    const body = await parseBody<Partial<Input>>(request);
    
    if (!body) {
      return errorResponse(ERROR_CODES.BAD_REQUEST, 'Invalid request body', HTTP_STATUS.BAD_REQUEST);
    }
    
    // Validate
    if (options.validate) {
      const errors = options.validate(body);
      if (errors.length > 0) {
        return validationErrorResponse(errors);
      }
    }
    
    const supabase = await createClient();
    
    // Check exists
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (!existing) {
      return notFoundResponse();
    }
    
    const updateData = options.transform
      ? options.transform(body, context)
      : {
          ...body,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        };
    
    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, HTTP_STATUS.INTERNAL_ERROR);
    }
    
    const transformed = options.responseTransform ? options.responseTransform(data) : data as T;
    
    return successResponse(transformed);
  };
}

/**
 * Create delete handler.
 */
export function createDeleteHandler(
  table: string
): (id: string) => ApiHandler<{ deleted: boolean }> {
  return (id: string) => async (_request, context) => {
    const supabase = await createClient();
    
    // Check exists
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .single();
    
    if (!existing) {
      return notFoundResponse();
    }
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) {
      return errorResponse(ERROR_CODES.INTERNAL_ERROR, error.message, HTTP_STATUS.INTERNAL_ERROR);
    }
    
    return successResponse({ deleted: true }, undefined, HTTP_STATUS.OK);
  };
}

// ============================================================================
// REQUEST LOGGING
// ============================================================================

export interface ApiLog {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  organizationId?: string;
  statusCode: number;
  duration: number;
  timestamp: string;
}

/**
 * Log API request.
 */
export async function logApiRequest(
  request: NextRequest,
  response: NextResponse,
  context: ApiContext,
  startTime: number
): Promise<void> {
  const duration = Date.now() - startTime;
  
  const log: ApiLog = {
    requestId: context.requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    userId: context.userId,
    organizationId: context.organizationId,
    statusCode: response.status,
    duration,
    timestamp: new Date().toISOString(),
  };
  
  // In production, send to logging service
  if (process.env.NODE_ENV === 'development') {
    console.log('[API]', JSON.stringify(log));
  }
  
  // Store in database for analytics
  const supabase = await createClient();
  await supabase.from('api_logs').insert({
    request_id: log.requestId,
    method: log.method,
    path: log.path,
    user_id: log.userId,
    organization_id: log.organizationId,
    status_code: log.statusCode,
    duration_ms: log.duration,
  });
}
