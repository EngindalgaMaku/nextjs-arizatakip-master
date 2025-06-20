export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string | null
          role: string | null
          name: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string | null
          role?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string | null
          role?: string | null
          name?: string | null
        }
        Relationships: []
      }
      live_exams: {
        Row: {
          id: string
          title: string
          description: string | null
          test_id: string
          scheduled_start_time: string
          scheduled_end_time: string
          time_limit: number
          max_attempts: number
          randomize_questions: boolean
          randomize_options: boolean
          auto_publish_results: boolean
          allow_late_submissions: boolean
          status: 'scheduled' | 'active' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
          created_by: string | null
          actual_start_time: string | null
          actual_end_time: string | null
          class_ids: string[] | null
          student_ids: string[] | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          test_id: string
          scheduled_start_time: string
          scheduled_end_time: string
          time_limit: number
          max_attempts?: number
          randomize_questions?: boolean
          randomize_options?: boolean
          auto_publish_results?: boolean
          allow_late_submissions?: boolean
          status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
          created_by?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          class_ids?: string[] | null
          student_ids?: string[] | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          test_id?: string
          scheduled_start_time?: string
          scheduled_end_time?: string
          time_limit?: number
          max_attempts?: number
          randomize_questions?: boolean
          randomize_options?: boolean
          auto_publish_results?: boolean
          allow_late_submissions?: boolean
          status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
          created_by?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          class_ids?: string[] | null
          student_ids?: string[] | null
        }
      }
      live_exam_attempts: {
        Row: {
          id: string
          live_exam_id: string
          student_id: string
          start_time: string
          end_time: string | null
          status: 'active' | 'completed' | 'disconnected'
          score: number | null
          progress: number | null
          answers: Json | null
          current_question: number | null
          last_active: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          live_exam_id: string
          student_id: string
          start_time: string
          end_time?: string | null
          status?: 'active' | 'completed' | 'disconnected'
          score?: number | null
          progress?: number | null
          answers?: Json | null
          current_question?: number | null
          last_active?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          live_exam_id?: string
          student_id?: string
          start_time?: string
          end_time?: string | null
          status?: 'active' | 'completed' | 'disconnected'
          score?: number | null
          progress?: number | null
          answers?: Json | null
          current_question?: number | null
          last_active?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Diğer tablolar burada tanımlanabilir
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 