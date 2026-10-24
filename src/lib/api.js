import axios from 'axios';

/**
 * EcoLoop Shared Axios Client Instance
 * Configured with withCredentials: true for HTTP-only cookie persistence
 * (JWT auth tokens, session cookies, and cross-origin secure requests).
 */
const api = axios.create({
  baseURL: typeof window !== 'undefined' && window.__ECOLOOP_API_BASE__ 
    ? window.__ECOLOOP_API_BASE__ 
    : '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 20000,
});

// Response interceptor to normalize error handling and payloads
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorDetails = {
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Network error communicating with EcoLoop API gateway',
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(errorDetails);
  }
);

export default api;
export { api };
