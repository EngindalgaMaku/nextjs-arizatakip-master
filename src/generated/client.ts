/**
 * Generated client types
 * This is a simplified mock to satisfy TypeScript
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
  SUBSTITUTE_TEACHER = 'SUBSTITUTE_TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  USER = 'USER'
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  school_id?: string;
  [key: string]: any;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: string;
  device_type: string;
  device_name: string;
  reported_by: string;
  room_number?: string;
  school_id?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface School {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  district?: string;
  student_count?: number;
  teacher_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
} 