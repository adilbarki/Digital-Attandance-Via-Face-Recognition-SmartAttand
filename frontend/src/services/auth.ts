import type { SignupRequest, AuthResponse, User } from '../types/user';
import api from './api';

export const login = async (data: { email: string; password: string; remember_me?: boolean }): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', data);
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('user', JSON.stringify(response.data));
  }
  return response.data;
};

export const signup = async (data: SignupRequest): Promise<User> => {
  const response = await api.post('/auth/signup', data);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('savedEmail');
  window.location.href = '/login';
};

export const getCurrentUser = (): AuthResponse | null => {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem('token') !== null;
};