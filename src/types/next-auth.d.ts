/**
 * Type definitions for next-auth
 * These are simplified mock types to satisfy TypeScript without installing the package
 */

declare module 'next-auth' {
  export interface Session {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
      role?: string;
      user_metadata?: {
        school_id?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
    expires: string;
    [key: string]: any;
  }

  export interface AuthOptions {
    providers: any[];
    session?: {
      strategy?: 'jwt' | 'database';
      maxAge?: number;
      updateAge?: number;
    };
    callbacks?: {
      signIn?: (params: any) => Promise<boolean> | boolean;
      redirect?: (params: any) => Promise<string> | string;
      session?: (params: any) => Promise<any> | any;
      jwt?: (params: any) => Promise<any> | any;
    };
    pages?: {
      signIn?: string;
      signOut?: string;
      error?: string;
      verifyRequest?: string;
      newUser?: string;
    };
    [key: string]: any;
  }

  export function getServerSession(
    ...args: any[]
  ): Promise<Session | null>;
} 