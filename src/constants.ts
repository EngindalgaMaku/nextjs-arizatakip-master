/**
 * Application constants
 */

// Cookie names
export const COOKIE_NAME = 'admin-session';
export const AUTH_COOKIE_NAME = 'sb-auth-token';

// Local storage keys
export const USER_STORAGE_KEY = 'adminUser';
export const FCM_TOKEN_KEY = 'fcm_token';
export const FCM_USER_ROLE_KEY = 'fcm_user_role';

// API endpoints
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Feature flags
export const ENABLE_NOTIFICATIONS = true;
export const ENABLE_SERVICE_WORKER = true;

// App settings
export const DEFAULT_SITE_NAME = 'ATSİS - Arıza Takip Sistemi';
export const DEFAULT_PAGINATION_LIMIT = 10;
export const DEFAULT_THEME = 'light';

// User roles
export const ADMIN_ROLE = 'admin';
export const SCHOOL_ADMIN_ROLE = 'school_admin';
export const TEACHER_ROLE = 'teacher';
export const SUBSTITUTE_TEACHER_ROLE = 'substitute_teacher';
export const STUDENT_ROLE = 'student';
export const PARENT_ROLE = 'parent';
export const USER_ROLE = 'user';

// Issue status values
export const ISSUE_STATUS = {
  PENDING: 'beklemede',
  ASSIGNED: 'atandi',
  IN_PROGRESS: 'inceleniyor',
  RESOLVED: 'cozuldu',
  CLOSED: 'kapatildi'
}; 