'use server';

import { supabase } from '@/lib/supabase';
import { cache } from 'react';

export interface DashboardStats {
  openIssuesCount: number;
  resolvedIssuesCount: number;
  usersCount: number;
  totalIssuesCount: number;
  deviceTypeCounts: {
    [key: string]: number;
  };
  statusCounts: {
    [key: string]: number;
  };
  recentIssues: any[];
  timelineData: {
    date: string;
    count: number;
  }[];
}

/**
 * Get dashboard statistics
 * @param schoolId - Optional school ID, if not provided will try to get from session
 * @returns Dashboard statistics
 */
export const getDashboardStats = cache(async (schoolId?: string): Promise<DashboardStats> => {
  try {
    // Default response structure
    const defaultStats: DashboardStats = {
      openIssuesCount: 0,
      resolvedIssuesCount: 0,
      usersCount: 0,
      totalIssuesCount: 0,
      deviceTypeCounts: {},
      statusCounts: {},
      recentIssues: [],
      timelineData: []
    };
    
    // If no school ID provided, try to get it from the user's session
    if (!schoolId) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found when getting dashboard stats');
        return defaultStats;
      }
      
      // Get school ID from user metadata
      const userSchoolId = session.user?.user_metadata?.school_id;
      
      if (userSchoolId) {
        schoolId = userSchoolId;
      }
    }

    // Fetch all issues without filtering by school
    const query: any = supabase.from('issues').select('*');
    
    // Fetch all issues
    const { data: issues, error } = await query;
    
    if (error) {
      console.error('Error fetching issues for dashboard:', error);
      return defaultStats;
    }
    
    // Fetch users count
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', parseInt(schoolId || '0'));
    
    if (usersError) {
      console.error('Error fetching users count:', usersError);
    }
    
    // Process data for statistics
    const issuesData = issues || [];
    const openIssues = issuesData.filter(issue => 
      issue.status !== 'cozuldu' && issue.status !== 'kapatildi'
    );
    
    const resolvedIssues = issuesData.filter(issue => 
      issue.status === 'cozuldu' || issue.status === 'kapatildi'
    );
    
    // Count by device type
    const deviceTypeCounts = issuesData.reduce((acc: {[key: string]: number}, issue) => {
      const deviceType = issue.device_type || 'other';
      acc[deviceType] = (acc[deviceType] || 0) + 1;
      return acc;
    }, {});
    
    // Count by status
    const statusCounts = issuesData.reduce((acc: {[key: string]: number}, issue) => {
      const status = issue.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Get recent issues, sorted by creation date (newest first)
    const recentIssues = [...issuesData]
      .filter((issue): issue is typeof issue & { created_at: string } => !!issue.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    // Generate timeline data for the last 30 days
    const timelineData: { date: string; count: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const count = issuesData.filter(issue => {
        if (!issue.created_at) return false;
        const issueDate = new Date(issue.created_at).toISOString().split('T')[0];
        return issueDate === dateString;
      }).length;
      
      timelineData.unshift({ date: dateString ?? '', count });
    }
    
    return {
      openIssuesCount: openIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
      usersCount: usersCount || 0,
      totalIssuesCount: issuesData.length,
      deviceTypeCounts,
      statusCounts,
      recentIssues,
      timelineData
    };
    
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      openIssuesCount: 0,
      resolvedIssuesCount: 0,
      usersCount: 0,
      totalIssuesCount: 0,
      deviceTypeCounts: {},
      statusCounts: {},
      recentIssues: [],
      timelineData: []
    };
  }
}); 