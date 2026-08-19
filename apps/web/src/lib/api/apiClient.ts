/// <reference types="vite/client" />

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';

export interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

const inFlightGetRequests = new Map<string, Promise<unknown>>();

const getRequestKey = (url: string, config: RequestInit) => {
  const headerEntries = Array.from(new Headers(config.headers).entries()).sort(([first], [second]) => first.localeCompare(second));
  return `${url}::${JSON.stringify(headerEntries)}`;
};

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function handleAuthFailure(errorCode?: string) {
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_id');
  if (window.location.pathname !== '/login') {
    const reason = errorCode === 'SESSION_OVERRIDDEN' ? '?reason=session_overridden' : '';
    window.location.href = `/login${reason}`;
  }
}

async function sendRequest<T>(url: string, config: RequestInit, endpoint: string, isRetry = false): Promise<T> {
  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    let errorCode = '';
    let validationErrors: any[] | undefined = undefined;

    try {
      const errorData = await response.json();
      if (errorData.error?.code) {
        errorCode = errorData.error.code;
      }
      
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }

      if (Array.isArray(errorData.errors)) {
        validationErrors = errorData.errors;
      }
    } catch {
      // JSON parsing failed, use default message
    }

    // Attempt automatic silent refresh if 401 occurs on ordinary endpoints
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && !isRetry) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry original request with refreshed session cookie
        return sendRequest<T>(url, config, endpoint, true);
      }
      handleAuthFailure(errorCode);
    } else if (response.status === 401 && !endpoint.includes('/auth/login')) {
      handleAuthFailure(errorCode);
    }

    const error = new Error(errorMessage) as any;
    if (validationErrors) {
      error.errors = validationErrors;
    }
    throw error;
  }

  return response.json();
}

export async function apiClient<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method: options.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
    credentials: 'include',
  };

  const method = config.method?.toUpperCase() || 'GET';
  if (method !== 'GET' || config.signal) {
    return sendRequest<T>(url, config, endpoint);
  }

  const requestKey = getRequestKey(url, config);
  const existingRequest = inFlightGetRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = sendRequest<T>(url, config, endpoint);
  inFlightGetRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    if (inFlightGetRequests.get(requestKey) === request) {
      inFlightGetRequests.delete(requestKey);
    }
  }
}
