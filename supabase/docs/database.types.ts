// NOTE 2026-05-31:
// Este archivo esta desactualizado respecto de las migraciones recientes.
// Faltan tipos para `cotizacion_line_templates`, `pagos_suscripcion`, `public_landing_gallery`,
// `public_landing_testimonials` y `onboarding_checklists`.
// Regenerar con:
//   pnpm exec supabase gen types typescript --linked --schema public
// cuando `SUPABASE_DB_PASSWORD` este configurado.

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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          actualizado_en: string | null
          correo: string | null
          creado_en: string | null
          direccion: string | null
          eliminado_en: string | null
          estado_manual: string | null
          id: number
          nombre: string
          organization_id: number
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string | null
          correo?: string | null
          creado_en?: string | null
          direccion?: string | null
          eliminado_en?: string | null
          estado_manual?: string | null
          id?: never
          nombre: string
          organization_id: number
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string | null
          correo?: string | null
          creado_en?: string | null
          direccion?: string | null
          eliminado_en?: string | null
          estado_manual?: string | null
          id?: never
          nombre?: string
          organization_id?: number
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_materials: {
        Row: {
          configuration_id: number
          creado_en: string | null
          formula: string | null
          id: number
          material_id: number
          merma_pct: number | null
          orden: number | null
          requerido: boolean | null
          rol_material: string | null
        }
        Insert: {
          configuration_id: number
          creado_en?: string | null
          formula?: string | null
          id?: number
          material_id: number
          merma_pct?: number | null
          orden?: number | null
          requerido?: boolean | null
          rol_material?: string | null
        }
        Update: {
          configuration_id?: number
          creado_en?: string | null
          formula?: string | null
          id?: number
          material_id?: number
          merma_pct?: number | null
          orden?: number | null
          requerido?: boolean | null
          rol_material?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuration_materials_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "system_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_configuration_material_config"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "system_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_configuration_material_material"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_code_counters: {
        Row: {
          created_at: string
          last_number: number
          organization_id: number
          quote_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_number?: number
          organization_id: number
          quote_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_number?: number
          organization_id?: number
          quote_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      cotizacion_items: {
        Row: {
          actualizado_en: string | null
          alto: number | null
          ancho: number | null
          area_m2: number | null
          cantidad: number
          codigo: string | null
          color: string | null
          configuration_id: number | null
          costo_total: number | null
          costo_unitario: number | null
          cotizacion_id: number
          creado_en: string | null
          descripcion: string | null
          eliminado_en: string | null
          id: number
          linea: string | null
          margen_pct: number | null
          nombre: string | null
          observaciones: string | null
          orden: number | null
          organization_id: number
          precio_unitario: number
          product_type_id: number | null
          subtotal: number
          system_line_id: number | null
          tipo_componente: string | null
          tipo_item: string | null
          unidad: string | null
          utilidad: number | null
          vidrio: string | null
        }
        Insert: {
          actualizado_en?: string | null
          alto?: number | null
          ancho?: number | null
          area_m2?: number | null
          cantidad: number
          codigo?: string | null
          color?: string | null
          configuration_id?: number | null
          costo_total?: number | null
          costo_unitario?: number | null
          cotizacion_id: number
          creado_en?: string | null
          descripcion?: string | null
          eliminado_en?: string | null
          id?: never
          linea?: string | null
          margen_pct?: number | null
          nombre?: string | null
          observaciones?: string | null
          orden?: number | null
          organization_id: number
          precio_unitario: number
          product_type_id?: number | null
          subtotal: number
          system_line_id?: number | null
          tipo_componente?: string | null
          tipo_item?: string | null
          unidad?: string | null
          utilidad?: number | null
          vidrio?: string | null
        }
        Update: {
          actualizado_en?: string | null
          alto?: number | null
          ancho?: number | null
          area_m2?: number | null
          cantidad?: number
          codigo?: string | null
          color?: string | null
          configuration_id?: number | null
          costo_total?: number | null
          costo_unitario?: number | null
          cotizacion_id?: number
          creado_en?: string | null
          descripcion?: string | null
          eliminado_en?: string | null
          id?: never
          linea?: string | null
          margen_pct?: number | null
          nombre?: string | null
          observaciones?: string | null
          orden?: number | null
          organization_id?: number
          precio_unitario?: number
          product_type_id?: number | null
          subtotal?: number
          system_line_id?: number | null
          tipo_componente?: string | null
          tipo_item?: string | null
          unidad?: string | null
          utilidad?: number | null
          vidrio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_item_configuration"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "system_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_item_line"
            columns: ["system_line_id"]
            isOneToOne: false
            referencedRelation: "system_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_item_product_type"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_item_quote"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          actualizado_en: string | null
          approval_token: string | null
          approval_token_expires_at: string | null
          cliente_respondio_en: string | null
          cliente_respuesta_canal: string | null
          cliente_vio_en: string | null
          costo_total: number | null
          creado_en: string | null
          descuento_pct: number | null
          eliminado_en: string | null
          estado: string
          estado_comercial: string | null
          flete: number | null
          id: number
          iva: number | null
          margen_pct: number | null
          notas: string | null
          numero: string | null
          organization_id: number
          proyecto_id: number | null
          subtotal_neto: number | null
          total: number
          utilidad_total: number | null
          valido_hasta: string | null
        }
        Insert: {
          actualizado_en?: string | null
          approval_token?: string | null
          approval_token_expires_at?: string | null
          cliente_respondio_en?: string | null
          cliente_respuesta_canal?: string | null
          cliente_vio_en?: string | null
          costo_total?: number | null
          creado_en?: string | null
          descuento_pct?: number | null
          eliminado_en?: string | null
          estado: string
          estado_comercial?: string | null
          flete?: number | null
          id?: never
          iva?: number | null
          margen_pct?: number | null
          notas?: string | null
          numero?: string | null
          organization_id: number
          proyecto_id?: number | null
          subtotal_neto?: number | null
          total: number
          utilidad_total?: number | null
          valido_hasta?: string | null
        }
        Update: {
          actualizado_en?: string | null
          approval_token?: string | null
          approval_token_expires_at?: string | null
          cliente_respondio_en?: string | null
          cliente_respuesta_canal?: string | null
          cliente_vio_en?: string | null
          costo_total?: number | null
          creado_en?: string | null
          descuento_pct?: number | null
          eliminado_en?: string | null
          estado?: string
          estado_comercial?: string | null
          flete?: number | null
          id?: never
          iva?: number | null
          margen_pct?: number | null
          notas?: string | null
          numero?: string | null
          organization_id?: number
          proyecto_id?: number | null
          subtotal_neto?: number | null
          total?: number
          utilidad_total?: number | null
          valido_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      formula_variables: {
        Row: {
          creado_en: string | null
          descripcion: string | null
          ejemplo: string | null
          id: number
          nombre: string
        }
        Insert: {
          creado_en?: string | null
          descripcion?: string | null
          ejemplo?: string | null
          id?: number
          nombre: string
        }
        Update: {
          creado_en?: string | null
          descripcion?: string | null
          ejemplo?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      historial_precios: {
        Row: {
          cambiado_por: number | null
          fecha: string | null
          id: number
          material_id: number | null
          organization_id: number
          precio: number
          precio_anterior: number | null
        }
        Insert: {
          cambiado_por?: number | null
          fecha?: string | null
          id?: never
          material_id?: number | null
          organization_id: number
          precio: number
          precio_anterior?: number | null
        }
        Update: {
          cambiado_por?: number | null
          fecha?: string | null
          id?: never
          material_id?: number | null
          organization_id?: number
          precio?: number
          precio_anterior?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_precios_cambiado_por_fkey"
            columns: ["cambiado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_precios_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_precios_organizacion_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_costs: {
        Row: {
          activo: boolean | null
          creado_en: string | null
          id: number
          monto: number | null
          nombre: string | null
          organization_id: number
          tipo: string | null
          unidad: string | null
        }
        Insert: {
          activo?: boolean | null
          creado_en?: string | null
          id?: number
          monto?: number | null
          nombre?: string | null
          organization_id: number
          tipo?: string | null
          unidad?: string | null
        }
        Update: {
          activo?: boolean | null
          creado_en?: string | null
          id?: number
          monto?: number | null
          nombre?: string | null
          organization_id?: number
          tipo?: string | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_labor_org"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      line_glass_compatibility: {
        Row: {
          creado_en: string | null
          glass_material_id: number
          id: number
          permitido: boolean | null
          recomendado: boolean | null
          system_line_id: number
        }
        Insert: {
          creado_en?: string | null
          glass_material_id: number
          id?: number
          permitido?: boolean | null
          recomendado?: boolean | null
          system_line_id: number
        }
        Update: {
          creado_en?: string | null
          glass_material_id?: number
          id?: number
          permitido?: boolean | null
          recomendado?: boolean | null
          system_line_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_glass_material"
            columns: ["glass_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_glass_compatibility_system_line_id_fkey"
            columns: ["system_line_id"]
            isOneToOne: false
            referencedRelation: "system_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      material_types: {
        Row: {
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          actualizado_en: string | null
          categoria: string | null
          costo: number
          creado_en: string | null
          eliminado_en: string | null
          id: number
          inventario: number
          material_type_id: string | null
          nombre: string
          organization_id: number
          precio_venta: number | null
          unidad: string | null
        }
        Insert: {
          actualizado_en?: string | null
          categoria?: string | null
          costo: number
          creado_en?: string | null
          eliminado_en?: string | null
          id?: never
          inventario: number
          material_type_id?: string | null
          nombre: string
          organization_id: number
          precio_venta?: number | null
          unidad?: string | null
        }
        Update: {
          actualizado_en?: string | null
          categoria?: string | null
          costo?: number
          creado_en?: string | null
          eliminado_en?: string | null
          id?: never
          inventario?: number
          material_type_id?: string | null
          nombre?: string
          organization_id?: number
          precio_venta?: number | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_material_type"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "material_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_profile: {
        Row: {
          actualizado_en: string
          brand_color: string
          creado_en: string
          empresa_direccion: string | null
          empresa_email: string | null
          empresa_logo_url: string | null
          empresa_nombre: string | null
          empresa_telefono: string | null
          forma_pago: string | null
          margen_defecto: number | null
          modo_precio_preferido: string
          organization_id: number
          proveedor_preferido: string | null
          responsable_comercial: string | null
          solicitud_publica_privacidad: string | null
          solicitud_publica_slug: string | null
          solicitud_publica_valor: string | null
        }
        Insert: {
          actualizado_en?: string
          brand_color?: string
          creado_en?: string
          empresa_direccion?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_nombre?: string | null
          empresa_telefono?: string | null
          forma_pago?: string | null
          margen_defecto?: number | null
          modo_precio_preferido?: string
          organization_id: number
          proveedor_preferido?: string | null
          responsable_comercial?: string | null
          solicitud_publica_privacidad?: string | null
          solicitud_publica_slug?: string | null
          solicitud_publica_valor?: string | null
        }
        Update: {
          actualizado_en?: string
          brand_color?: string
          creado_en?: string
          empresa_direccion?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_nombre?: string | null
          empresa_telefono?: string | null
          forma_pago?: string | null
          margen_defecto?: number | null
          modo_precio_preferido?: string
          organization_id?: number
          proveedor_preferido?: string | null
          responsable_comercial?: string | null
          solicitud_publica_privacidad?: string | null
          solicitud_publica_slug?: string | null
          solicitud_publica_valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_profile_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          actualizado_en: string | null
          correo: string | null
          creado_en: string | null
          direccion: string | null
          eliminado_en: string | null
          id: number
          logo_url: string | null
          nombre: string
          plan: string | null
          telefono: string | null
        }
        Insert: {
          actualizado_en?: string | null
          correo?: string | null
          creado_en?: string | null
          direccion?: string | null
          eliminado_en?: string | null
          id?: never
          logo_url?: string | null
          nombre: string
          plan?: string | null
          telefono?: string | null
        }
        Update: {
          actualizado_en?: string | null
          correo?: string | null
          creado_en?: string | null
          direccion?: string | null
          eliminado_en?: string | null
          id?: never
          logo_url?: string | null
          nombre?: string
          plan?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      product_types: {
        Row: {
          creado_en: string | null
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          creado_en?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          creado_en?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          actualizado_en: string | null
          cliente_id: number | null
          creado_en: string | null
          descripcion: string | null
          eliminado_en: string | null
          estado: string | null
          id: number
          organization_id: number
          titulo: string
        }
        Insert: {
          actualizado_en?: string | null
          cliente_id?: number | null
          creado_en?: string | null
          descripcion?: string | null
          eliminado_en?: string | null
          estado?: string | null
          id?: never
          organization_id: number
          titulo: string
        }
        Update: {
          actualizado_en?: string | null
          cliente_id?: number | null
          creado_en?: string | null
          descripcion?: string | null
          eliminado_en?: string | null
          estado?: string | null
          id?: never
          organization_id?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "admin_clientes_eliminados"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_item_breakdown: {
        Row: {
          cantidad: number | null
          costo_total: number | null
          costo_unitario: number | null
          cotizacion_item_id: number
          creado_en: string | null
          descripcion: string | null
          id: number
          material_id: number
          organization_id: number
          origen: string | null
          precio_total: number | null
          precio_unitario: number | null
          unidad: string | null
        }
        Insert: {
          cantidad?: number | null
          costo_total?: number | null
          costo_unitario?: number | null
          cotizacion_item_id: number
          creado_en?: string | null
          descripcion?: string | null
          id?: number
          material_id: number
          organization_id: number
          origen?: string | null
          precio_total?: number | null
          precio_unitario?: number | null
          unidad?: string | null
        }
        Update: {
          cantidad?: number | null
          costo_total?: number | null
          costo_unitario?: number | null
          cotizacion_item_id?: number
          creado_en?: string | null
          descripcion?: string | null
          id?: number
          material_id?: number
          organization_id?: number
          origen?: string | null
          precio_total?: number | null
          precio_unitario?: number | null
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_breakdown_item"
            columns: ["cotizacion_item_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_breakdown_material"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_item_breakdown_cotizacion_item_id_fkey"
            columns: ["cotizacion_item_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_item_breakdown_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_contacto: {
        Row: {
          actualizado_en: string
          ayuda: string
          contacto: string | null
          contexto: string
          correo: string | null
          creado_en: string
          empresa: string
          estado: string
          id: string
          ip: string | null
          mensaje: string | null
          nombre: string
          organization_id: number | null
          origen: string
          source_url: string | null
          telefono: string | null
          tipo_trabajo: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          actualizado_en?: string
          ayuda: string
          contacto?: string | null
          contexto?: string
          correo?: string | null
          creado_en?: string
          empresa: string
          estado?: string
          id?: string
          ip?: string | null
          mensaje?: string | null
          nombre: string
          organization_id?: number | null
          origen?: string
          source_url?: string | null
          telefono?: string | null
          tipo_trabajo?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          actualizado_en?: string
          ayuda?: string
          contacto?: string | null
          contexto?: string
          correo?: string | null
          creado_en?: string
          empresa?: string
          estado?: string
          id?: string
          ip?: string | null
          mensaje?: string | null
          nombre?: string
          organization_id?: number | null
          origen?: string
          source_url?: string | null
          telefono?: string | null
          tipo_trabajo?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_contacto_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_configurations: {
        Row: {
          activo: boolean | null
          creado_en: string | null
          descripcion: string | null
          hojas: number | null
          id: number
          nombre: string | null
          organization_id: number | null
          product_type_id: number | null
          system_line_id: number | null
        }
        Insert: {
          activo?: boolean | null
          creado_en?: string | null
          descripcion?: string | null
          hojas?: number | null
          id?: number
          nombre?: string | null
          organization_id?: number | null
          product_type_id?: number | null
          system_line_id?: number | null
        }
        Update: {
          activo?: boolean | null
          creado_en?: string | null
          descripcion?: string | null
          hojas?: number | null
          id?: number
          nombre?: string | null
          organization_id?: number | null
          product_type_id?: number | null
          system_line_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_configuration_line"
            columns: ["system_line_id"]
            isOneToOne: false
            referencedRelation: "system_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_configurations_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_configurations_system_line_id_fkey"
            columns: ["system_line_id"]
            isOneToOne: false
            referencedRelation: "system_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      system_lines: {
        Row: {
          creado_en: string | null
          descripcion: string | null
          espesor_max_vidrio_mm: number | null
          id: number
          material_base: string | null
          nombre: string
          organization_id: number | null
          tipo_apertura: string | null
        }
        Insert: {
          creado_en?: string | null
          descripcion?: string | null
          espesor_max_vidrio_mm?: number | null
          id?: number
          material_base?: string | null
          nombre: string
          organization_id?: number | null
          tipo_apertura?: string | null
        }
        Update: {
          creado_en?: string | null
          descripcion?: string | null
          espesor_max_vidrio_mm?: number | null
          id?: number
          material_base?: string | null
          nombre?: string
          organization_id?: number | null
          tipo_apertura?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          actualizado_en: string | null
          auth_user_id: string | null
          correo: string
          creado_en: string | null
          eliminado_en: string | null
          id: number
          organization_id: number
          rol: string
        }
        Insert: {
          actualizado_en?: string | null
          auth_user_id?: string | null
          correo: string
          creado_en?: string | null
          eliminado_en?: string | null
          id?: never
          organization_id: number
          rol: string
        }
        Update: {
          actualizado_en?: string | null
          auth_user_id?: string | null
          correo?: string
          creado_en?: string | null
          eliminado_en?: string | null
          id?: never
          organization_id?: number
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      web_push_subscriptions: {
        Row: {
          auth: string
          auth_user_id: string
          created_at: string
          endpoint: string
          id: number
          is_active: boolean
          last_seen_at: string
          organization_id: number
          p256dh: string
          subscription: Json
          updated_at: string
          user_agent: string | null
          user_email: string | null
        }
        Insert: {
          auth: string
          auth_user_id: string
          created_at?: string
          endpoint: string
          id?: never
          is_active?: boolean
          last_seen_at?: string
          organization_id: number
          p256dh: string
          subscription: Json
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
        }
        Update: {
          auth?: string
          auth_user_id?: string
          created_at?: string
          endpoint?: string
          id?: never
          is_active?: boolean
          last_seen_at?: string
          organization_id?: number
          p256dh?: string
          subscription?: Json
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_clientes_eliminados: {
        Row: {
          cliente_actualizado_en: string | null
          cliente_correo: string | null
          cliente_creado_en: string | null
          cliente_direccion: string | null
          cliente_eliminado_en: string | null
          cliente_id: number | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          cotizaciones_codigos: string | null
          cotizaciones_eliminadas: number | null
          organization_id: number | null
          proyectos_eliminados: number | null
          proyectos_ids: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_purgar_clientes_eliminados: {
        Args: { retention_days?: number }
        Returns: {
          breakdowns_purgados: number
          clientes_purgados: number
          cotizaciones_purgadas: number
          items_purgados: number
          proyectos_purgados: number
        }[]
      }
      get_org_id: { Args: never; Returns: number }
      reserve_next_cotizacion_code: {
        Args: { p_organization_id: number; p_quote_date?: string }
        Returns: string
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
