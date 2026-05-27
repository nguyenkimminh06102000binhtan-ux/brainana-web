export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          condition: Json | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          condition?: Json | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          condition?: Json | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          avg_completion_days: number | null
          card_count: number
          category: string | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          has_audio: boolean
          has_images: boolean
          id: string
          is_private: boolean
          is_published: boolean
          learner_count: number
          level: string | null
          mems_count: number
          rating: number
          rating_count: number
          slug: string
          source_language: string | null
          tags: string[] | null
          target_language: string | null
          tier: string
          title: string
          updated_at: string
          verified: boolean
          visibility: string
        }
        Insert: {
          avg_completion_days?: number | null
          card_count?: number
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          has_audio?: boolean
          has_images?: boolean
          id?: string
          is_private?: boolean
          is_published?: boolean
          learner_count?: number
          level?: string | null
          mems_count?: number
          rating?: number
          rating_count?: number
          slug: string
          source_language?: string | null
          tags?: string[] | null
          target_language?: string | null
          tier?: string
          title: string
          updated_at?: string
          verified?: boolean
          visibility?: string
        }
        Update: {
          avg_completion_days?: number | null
          card_count?: number
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          has_audio?: boolean
          has_images?: boolean
          id?: string
          is_private?: boolean
          is_published?: boolean
          learner_count?: number
          level?: string | null
          mems_count?: number
          rating?: number
          rating_count?: number
          slug?: string
          source_language?: string | null
          tags?: string[] | null
          target_language?: string | null
          tier?: string
          title?: string
          updated_at?: string
          verified?: boolean
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          feature_key: string
          id: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          feature_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          feature_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_progress: {
        Row: {
          correct_count: number
          course_id: string
          ease_factor: number
          id: string
          incorrect_count: number
          interval_days: number
          item_id: string
          last_question_type: string | null
          last_reviewed_at: string | null
          mastered: boolean
          next_review_at: string
          repetitions: number
          streak: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          course_id: string
          ease_factor?: number
          id?: string
          incorrect_count?: number
          interval_days?: number
          item_id: string
          last_question_type?: string | null
          last_reviewed_at?: string | null
          mastered?: boolean
          next_review_at?: string
          repetitions?: number
          streak?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          course_id?: string
          ease_factor?: number
          id?: string
          incorrect_count?: number
          interval_days?: number
          item_id?: string
          last_question_type?: string | null
          last_reviewed_at?: string | null
          mastered?: boolean
          next_review_at?: string
          repetitions?: number
          streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          accepted_answers: string[] | null
          back: Json | null
          back_audio_url: string | null
          back_text: string
          course_id: string
          created_at: string
          distractors: string[] | null
          front: Json | null
          front_audio_url: string | null
          front_text: string
          id: string
          image_url: string | null
          section_id: string
          mems_count: number
          notes: string | null
          position: number
          romanization: string | null
        }
        Insert: {
          accepted_answers?: string[] | null
          back?: Json | null
          back_audio_url?: string | null
          back_text: string
          course_id: string
          created_at?: string
          distractors?: string[] | null
          front?: Json | null
          front_audio_url?: string | null
          front_text: string
          id?: string
          image_url?: string | null
          section_id: string
          mems_count?: number
          notes?: string | null
          position?: number
          romanization?: string | null
        }
        Update: {
          accepted_answers?: string[] | null
          back?: Json | null
          back_audio_url?: string | null
          back_text?: string
          course_id?: string
          created_at?: string
          distractors?: string[] | null
          front?: Json | null
          front_audio_url?: string | null
          front_text?: string
          id?: string
          image_url?: string | null
          section_id?: string
          mems_count?: number
          notes?: string | null
          position?: number
          romanization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      mem_votes: {
        Row: {
          created_at: string
          mem_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          mem_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          mem_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mem_votes_mem_id_fkey"
            columns: ["mem_id"]
            isOneToOne: false
            referencedRelation: "mems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mem_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mems: {
        Row: {
          author_id: string
          card_id: string
          created_at: string
          helpful_count: number
          id: string
          text: string
        }
        Insert: {
          author_id: string
          card_id: string
          created_at?: string
          helpful_count?: number
          id?: string
          text: string
        }
        Update: {
          author_id?: string
          card_id?: string
          created_at?: string
          helpful_count?: number
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "mems_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mems_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_streak: number
          daily_goal: number
          display_name: string | null
          id: string
          interests: string[] | null
          last_activity_date: string | null
          level: number
          longest_streak: number
          onboarding_completed: boolean
          plan: string
          purpose: string | null
          total_xp: number
          twitter_handle: string | null
          updated_at: string
          username: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          daily_goal?: number
          display_name?: string | null
          id: string
          interests?: string[] | null
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          onboarding_completed?: boolean
          plan?: string
          purpose?: string | null
          total_xp?: number
          twitter_handle?: string | null
          updated_at?: string
          username: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          daily_goal?: number
          display_name?: string | null
          id?: string
          interests?: string[] | null
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          onboarding_completed?: boolean
          plan?: string
          purpose?: string | null
          total_xp?: number
          twitter_handle?: string | null
          updated_at?: string
          username?: string
          website_url?: string | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          correct_count: number
          course_id: string
          ended_at: string | null
          id: string
          incorrect_count: number
          items_studied: number
          session_type: 'flashcard' | 'multiple_choice' | 'audio_type' | 'speed_match' | 'type_answer'
          started_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          correct_count?: number
          course_id: string
          ended_at?: string | null
          id?: string
          incorrect_count?: number
          items_studied?: number
          session_type?: 'flashcard' | 'multiple_choice' | 'audio_type' | 'speed_match' | 'type_answer'
          started_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          correct_count?: number
          course_id?: string
          ended_at?: string | null
          id?: string
          incorrect_count?: number
          items_studied?: number
          session_type?: 'flashcard' | 'multiple_choice' | 'audio_type' | 'speed_match' | 'type_answer'
          started_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_courses: {
        Row: {
          completed_items: number
          course_id: string
          enrolled_at: string
          id: string
          last_studied_at: string | null
          preferred_question_types: ('flashcard' | 'multiple_choice' | 'audio_type' | 'speed_match' | 'type_answer')[]
          user_id: string
        }
        Insert: {
          completed_items?: number
          course_id: string
          enrolled_at?: string
          id?: string
          last_studied_at?: string | null
          preferred_question_types?: ('flashcard' | 'multiple_choice' | 'audio_type' | 'speed_match' | 'type_answer')[]
          user_id: string
        }
        Update: {
          completed_items?: number
          course_id?: string
          enrolled_at?: string
          id?: string
          last_studied_at?: string | null
          preferred_question_types?: ('flashcard' | 'multiple_choice' | 'audio_type' | 'speed_match' | 'type_answer')[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
