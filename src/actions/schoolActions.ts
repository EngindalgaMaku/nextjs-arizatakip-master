'use server';

import { supabase } from '@/lib/supabase';
import { cache } from 'react';

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
}

/**
 * Get school information
 * @param schoolId - Optional school ID, if not provided will try to get from session
 * @returns School information
 */
export const getSchoolInfo = cache(async (schoolId?: string): Promise<School | null> => {
  try {
    // If no school ID provided, try to get it from the user's session
    if (!schoolId) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found when getting school info');
        return null;
      }
      
      // Get school ID from user metadata
      const userSchoolId = session.user?.user_metadata?.school_id;
      
      if (!userSchoolId) {
        console.error('No school ID found in user metadata');
        return null;
      }
      
      schoolId = userSchoolId;
    }
    
    // Fetch school data from Supabase
    const { data, error } = await supabase
      .from('schools' as any)
      .select('*')
      .eq('id', schoolId as string)
      .single();
    
    if (error) {
      console.error('Error fetching school info:', error);
      return null;
    }
    
    if (!data) {
      console.error('No school found with ID:', schoolId);
      return null;
    }
    
    return data && 'id' in data && 'name' in data && 'code' in data ? (data as unknown as School) : null;
    
  } catch (error) {
    console.error('Error in getSchoolInfo:', error);
    return null;
  }
}); 