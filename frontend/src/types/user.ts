export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  full_name: string;
  student_id?: string;
  class_id?: string;
}

export interface LoginRequest {
   email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  full_name: string;
  student_id?: string;
}

export interface AuthResponse {
  access_token: string;
  user_id: string;
  username: string;
  role: 'admin' | 'teacher' | 'student';
  full_name: string;
}