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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          cnpj: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          cnpj: string | null
          company_name: string | null
          contact: string | null
          created_at: string
          email: string | null
          footer_logo_url: string | null
          header_logo_url: string | null
          id: string
          responsible_name: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          company_name?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          footer_logo_url?: string | null
          header_logo_url?: string | null
          id?: string
          responsible_name?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          company_name?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          footer_logo_url?: string | null
          header_logo_url?: string | null
          id?: string
          responsible_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      device_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          installation_price: number
          model: string | null
          name: string
          specifications: Json | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          installation_price?: number
          model?: string | null
          name: string
          specifications?: Json | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          installation_price?: number
          model?: string | null
          name?: string
          specifications?: Json | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "device_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_devices: {
        Row: {
          created_at: string
          device_id: string
          floor_plan_id: string
          id: string
          notes: string | null
          rotation: number | null
          scale: number | null
          x_position: number
          y_position: number
        }
        Insert: {
          created_at?: string
          device_id: string
          floor_plan_id: string
          id?: string
          notes?: string | null
          rotation?: number | null
          scale?: number | null
          x_position: number
          y_position: number
        }
        Update: {
          created_at?: string
          device_id?: string
          floor_plan_id?: string
          id?: string
          notes?: string | null
          rotation?: number | null
          scale?: number | null
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_devices_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_devices_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "project_floor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_contracts: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          periodicity: string | null
          start_date: string | null
          status: string
          title: string
          type: string
          updated_at: string
          value: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          periodicity?: string | null
          start_date?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          periodicity?: string | null
          start_date?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_orders: {
        Row: {
          client_id: string
          completed_date: string | null
          contract_id: string | null
          created_at: string
          description: string | null
          equipment_attended: string[] | null
          id: string
          observations: string | null
          scheduled_date: string | null
          signature_url: string | null
          status: string
          technician: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_date?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          equipment_attended?: string[] | null
          id?: string
          observations?: string | null
          scheduled_date?: string | null
          signature_url?: string | null
          status?: string
          technician?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_date?: string | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          equipment_attended?: string[] | null
          id?: string
          observations?: string | null
          scheduled_date?: string | null
          signature_url?: string | null
          status?: string
          technician?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          order_id: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          order_id: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          order_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "maintenance_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          client_id: string
          contract_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          next_date: string
          notify_3_days: boolean
          notify_7_days: boolean
          notify_email: string | null
          periodicity: string
          technician: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          next_date: string
          notify_3_days?: boolean
          notify_7_days?: boolean
          notify_email?: string | null
          periodicity?: string
          technician?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          next_date?: string
          notify_3_days?: boolean
          notify_7_days?: boolean
          notify_email?: string | null
          periodicity?: string
          technician?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          client: string
          created_at: string
          id: string
          monthly_value: string | null
          notes: string | null
          responsible: string | null
          status: string
          title: string
          type: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          client: string
          created_at?: string
          id?: string
          monthly_value?: string | null
          notes?: string | null
          responsible?: string | null
          status?: string
          title: string
          type?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          client?: string
          created_at?: string
          id?: string
          monthly_value?: string | null
          notes?: string | null
          responsible?: string | null
          status?: string
          title?: string
          type?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          rejection_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          rejection_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          rejection_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          project_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_floor_plans: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          height: number | null
          id: string
          name: string
          project_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          name: string
          project_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          name?: string
          project_id?: string
          width?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          client: string
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          manager: string | null
          name: string
          opportunity_id: string | null
          start_date: string | null
          status: string
          type: string
          updated_at: string
          value: string | null
        }
        Insert: {
          client: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          manager?: string | null
          name: string
          opportunity_id?: string | null
          start_date?: string | null
          status?: string
          type: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          client?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          manager?: string | null
          name?: string
          opportunity_id?: string | null
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          created_at: string
          device_id: string | null
          device_name: string
          id: string
          installation_price: number
          proposal_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          device_name: string
          id?: string
          installation_price?: number
          proposal_id: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          device_id?: string | null
          device_name?: string
          id?: string
          installation_price?: number
          proposal_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_template_items: {
        Row: {
          created_at: string
          device_id: string | null
          device_name: string
          id: string
          installation_price: number
          quantity: number
          subtotal: number
          template_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          device_name: string
          id?: string
          installation_price?: number
          quantity?: number
          subtotal?: number
          template_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          device_id?: string | null
          device_name?: string
          id?: string
          installation_price?: number
          quantity?: number
          subtotal?: number
          template_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_template_items_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string
          created_by: string | null
          discount_percentage: number
          id: string
          introduction: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          scope: string | null
          title: string | null
          updated_at: string
          validity_days: number
          warranty_terms: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_percentage?: number
          id?: string
          introduction?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          scope?: string | null
          title?: string | null
          updated_at?: string
          validity_days?: number
          warranty_terms?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_percentage?: number
          id?: string
          introduction?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          scope?: string | null
          title?: string | null
          updated_at?: string
          validity_days?: number
          warranty_terms?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          discount_percentage: number | null
          grand_total: number | null
          id: string
          introduction: string | null
          notes: string | null
          payment_terms: string | null
          project_id: string
          scope: string | null
          status: string | null
          title: string
          total_devices: number | null
          total_discount: number | null
          total_installation: number | null
          updated_at: string
          validity_days: number | null
          warranty_terms: string | null
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          discount_percentage?: number | null
          grand_total?: number | null
          id?: string
          introduction?: string | null
          notes?: string | null
          payment_terms?: string | null
          project_id: string
          scope?: string | null
          status?: string | null
          title: string
          total_devices?: number | null
          total_discount?: number | null
          total_installation?: number | null
          updated_at?: string
          validity_days?: number | null
          warranty_terms?: string | null
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          discount_percentage?: number | null
          grand_total?: number | null
          id?: string
          introduction?: string | null
          notes?: string | null
          payment_terms?: string | null
          project_id?: string
          scope?: string | null
          status?: string | null
          title?: string
          total_devices?: number | null
          total_discount?: number | null
          total_installation?: number | null
          updated_at?: string
          validity_days?: number | null
          warranty_terms?: string | null
        }
        Relationships: []
      }
      report_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          report_id: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          report_id: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          report_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          id: string
          progress: number
          report_id: string
          status: string
          task_name: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          id?: string
          progress?: number
          report_id: string
          status?: string
          task_name: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          id?: string
          progress?: number
          report_id?: string
          status?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_tasks_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          author: string | null
          created_at: string
          id: string
          next_steps: string | null
          observations: string | null
          period_end: string | null
          period_start: string | null
          project_id: string | null
          project_name: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          next_steps?: string | null
          observations?: string | null
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          project_name: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          next_steps?: string | null
          observations?: string | null
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          project_name?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_tasks: {
        Row: {
          assignee: string | null
          color: string | null
          created_at: string
          end_date: string
          id: string
          name: string
          progress: number
          project_id: string | null
          project_name: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          color?: string | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          progress?: number
          project_id?: string | null
          project_name?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          color?: string | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          progress?: number
          project_id?: string | null
          project_name?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "user" | "sup_tecnico"
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
    Enums: {
      app_role: ["admin", "manager", "user", "sup_tecnico"],
    },
  },
} as const
