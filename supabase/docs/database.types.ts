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
      cotizacion_item_visual_configs: {
        Row: {
          actualizado_en: string
          config_json: Json
          cotizacion_item_id: number
          creado_en: string
          eliminado_en: string | null
          id: number
          organization_id: number
          schema_version: number
          svg_markup: string | null
        }
        Insert: {
          actualizado_en?: string
          config_json?: Json
          cotizacion_item_id: number
          creado_en?: string
          eliminado_en?: string | null
          id?: number
          organization_id: number
          schema_version?: number
          svg_markup?: string | null
        }
        Update: {
          actualizado_en?: string
          config_json?: Json
          cotizacion_item_id?: number
          creado_en?: string
          eliminado_en?: string | null
          id?: number
          organization_id?: number
          schema_version?: number
          svg_markup?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_item_visual_configs_cotizacion_item_id_fkey"
            columns: ["cotizacion_item_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_item_visual_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          fabricacion_snapshot: Json | null
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
          fabricacion_snapshot?: Json | null
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
          fabricacion_snapshot?: Json | null
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
      cotizacion_line_templates: {
        Row: {
          actualizado_en: string
          catalog_metadata: Json
          categoria: string
          costo_base: number
          creado_en: string
          eliminado_en: string | null
          id: number
          is_active: boolean
          margen_objetivo_pct: number | null
          material: string
          merma_pct: number
          minimo_cobrable: number
          nombre: string
          organization_id: number
          precio_m2_sugerido: number
          proveedor: string | null
          redondeo_precio: number
          sort_order: number
          unidad_cobro: string
          vidrio_principal_recomendado: string | null
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          actualizado_en?: string
          catalog_metadata?: Json
          categoria?: string
          costo_base?: number
          creado_en?: string
          eliminado_en?: string | null
          id?: number
          is_active?: boolean
          margen_objetivo_pct?: number | null
          material?: string
          merma_pct?: number
          minimo_cobrable?: number
          nombre: string
          organization_id: number
          precio_m2_sugerido?: number
          proveedor?: string | null
          redondeo_precio?: number
          sort_order?: number
          unidad_cobro?: string
          vidrio_principal_recomendado?: string | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          actualizado_en?: string
          catalog_metadata?: Json
          categoria?: string
          costo_base?: number
          creado_en?: string
          eliminado_en?: string | null
          id?: number
          is_active?: boolean
          margen_objetivo_pct?: number | null
          material?: string
          merma_pct?: number
          minimo_cobrable?: number
          nombre?: string
          organization_id?: number
          precio_m2_sugerido?: number
          proveedor?: string | null
          redondeo_precio?: number
          sort_order?: number
          unidad_cobro?: string
          vidrio_principal_recomendado?: string | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          actualizado_en: string | null
          approval_token: string | null
          approval_token_expires_at: string | null
          cliente_respondio_en: string | null
          cliente_respuesta_canal: string | null
          cliente_vio_en: string | null
          cost_basis_status: string | null
          costo_mano_obra_total: number | null
          costo_materiales_total: number | null
          costo_otros_total: number | null
          costo_total: number | null
          costo_traslado_total: number | null
          creado_en: string | null
          descuento_pct: number | null
          eliminado_en: string | null
          estado: string
          estado_comercial: string | null
          financial_snapshot_calculado_en: string | null
          financial_snapshot_version: number | null
          flete: number | null
          id: number
          iva: number | null
          iva_pct: number | null
          margen_objetivo_pct: number | null
          margen_pct: number | null
          merma_pct: number | null
          merma_total: number | null
          notas: string | null
          numero: string | null
          organization_id: number
          pdf_descargado_en: string | null
          precio_recomendado_neto: number | null
          pricing_mode: string
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
          cost_basis_status?: string | null
          costo_mano_obra_total?: number | null
          costo_materiales_total?: number | null
          costo_otros_total?: number | null
          costo_total?: number | null
          costo_traslado_total?: number | null
          creado_en?: string | null
          descuento_pct?: number | null
          eliminado_en?: string | null
          estado: string
          estado_comercial?: string | null
          financial_snapshot_calculado_en?: string | null
          financial_snapshot_version?: number | null
          flete?: number | null
          id?: never
          iva?: number | null
          iva_pct?: number | null
          margen_objetivo_pct?: number | null
          margen_pct?: number | null
          merma_pct?: number | null
          merma_total?: number | null
          notas?: string | null
          numero?: string | null
          organization_id: number
          pdf_descargado_en?: string | null
          precio_recomendado_neto?: number | null
          pricing_mode?: string
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
          cost_basis_status?: string | null
          costo_mano_obra_total?: number | null
          costo_materiales_total?: number | null
          costo_otros_total?: number | null
          costo_total?: number | null
          costo_traslado_total?: number | null
          creado_en?: string | null
          descuento_pct?: number | null
          eliminado_en?: string | null
          estado?: string
          estado_comercial?: string | null
          financial_snapshot_calculado_en?: string | null
          financial_snapshot_version?: number | null
          flete?: number | null
          id?: never
          iva?: number | null
          iva_pct?: number | null
          margen_objetivo_pct?: number | null
          margen_pct?: number | null
          merma_pct?: number | null
          merma_total?: number | null
          notas?: string | null
          numero?: string | null
          organization_id?: number
          pdf_descargado_en?: string | null
          precio_recomendado_neto?: number | null
          pricing_mode?: string
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
      fabrication_recipe_tests: {
        Row: {
          actual_output: Json | null
          created_at: string
          eliminado_en: string | null
          expected_output: Json
          id: string
          input: Json
          is_required: boolean
          name: string
          organization_id: number | null
          passed: boolean
          recipe_id: string
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          actual_output?: Json | null
          created_at?: string
          eliminado_en?: string | null
          expected_output: Json
          id?: string
          input: Json
          is_required?: boolean
          name: string
          organization_id?: number | null
          passed?: boolean
          recipe_id: string
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          actual_output?: Json | null
          created_at?: string
          eliminado_en?: string | null
          expected_output?: Json
          id?: string
          input?: Json
          is_required?: boolean
          name?: string
          organization_id?: number | null
          passed?: boolean
          recipe_id?: string
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fabrication_recipe_tests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabrication_recipe_tests_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "fabrication_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      fabrication_recipes: {
        Row: {
          created_at: string
          definition: Json
          eliminado_en: string | null
          id: string
          leaves_count: number | null
          line_name: string
          line_template_id: number | null
          organization_id: number | null
          parent_recipe_id: string | null
          provider_name: string
          scope: string
          source_reference: string | null
          source_type: string
          status: string
          typology: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          variant: string | null
          version: number
        }
        Insert: {
          created_at?: string
          definition: Json
          eliminado_en?: string | null
          id?: string
          leaves_count?: number | null
          line_name?: string
          line_template_id?: number | null
          organization_id?: number | null
          parent_recipe_id?: string | null
          provider_name?: string
          scope: string
          source_reference?: string | null
          source_type?: string
          status?: string
          typology: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          variant?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          definition?: Json
          eliminado_en?: string | null
          id?: string
          leaves_count?: number | null
          line_name?: string
          line_template_id?: number | null
          organization_id?: number | null
          parent_recipe_id?: string | null
          provider_name?: string
          scope?: string
          source_reference?: string | null
          source_type?: string
          status?: string
          typology?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          variant?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fabrication_recipes_line_template_id_fkey"
            columns: ["line_template_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_line_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabrication_recipes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fabrication_recipes_parent_recipe_id_fkey"
            columns: ["parent_recipe_id"]
            isOneToOne: false
            referencedRelation: "fabrication_recipes"
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
      growth_activities: {
        Row: {
          canal: string | null
          contenido: string | null
          creado_en: string
          creado_por_auth_user_id: string | null
          eliminado_en: string | null
          id: string
          metadata_json: Json
          prospect_id: string
          tipo: string
          workspace_id: string
        }
        Insert: {
          canal?: string | null
          contenido?: string | null
          creado_en?: string
          creado_por_auth_user_id?: string | null
          eliminado_en?: string | null
          id?: string
          metadata_json?: Json
          prospect_id: string
          tipo: string
          workspace_id: string
        }
        Update: {
          canal?: string | null
          contenido?: string | null
          creado_en?: string
          creado_por_auth_user_id?: string | null
          eliminado_en?: string | null
          id?: string
          metadata_json?: Json
          prospect_id?: string
          tipo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "growth_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "growth_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_prospects: {
        Row: {
          actualizado_en: string
          ciudad: string | null
          contacto_nombre: string | null
          converted_organization_id: number | null
          correo: string | null
          creado_en: string
          creado_por_auth_user_id: string | null
          data_status: string
          eliminado_en: string | null
          empresa: string
          estado: string
          fuente: string
          id: string
          instagram_url: string | null
          legacy_source_id: string | null
          motivo_perdida: string | null
          no_contactar: boolean
          proxima_accion_en: string | null
          proxima_accion_tipo: string | null
          puntaje_prioridad: number
          region: string | null
          resumen_personalizacion: string | null
          rubro: string | null
          segmento: string | null
          senal_dolor: string | null
          sitio_web: string | null
          telefono: string | null
          ultimo_contacto_en: string | null
          workspace_id: string
        }
        Insert: {
          actualizado_en?: string
          ciudad?: string | null
          contacto_nombre?: string | null
          converted_organization_id?: number | null
          correo?: string | null
          creado_en?: string
          creado_por_auth_user_id?: string | null
          data_status?: string
          eliminado_en?: string | null
          empresa: string
          estado?: string
          fuente?: string
          id?: string
          instagram_url?: string | null
          legacy_source_id?: string | null
          motivo_perdida?: string | null
          no_contactar?: boolean
          proxima_accion_en?: string | null
          proxima_accion_tipo?: string | null
          puntaje_prioridad?: number
          region?: string | null
          resumen_personalizacion?: string | null
          rubro?: string | null
          segmento?: string | null
          senal_dolor?: string | null
          sitio_web?: string | null
          telefono?: string | null
          ultimo_contacto_en?: string | null
          workspace_id: string
        }
        Update: {
          actualizado_en?: string
          ciudad?: string | null
          contacto_nombre?: string | null
          converted_organization_id?: number | null
          correo?: string | null
          creado_en?: string
          creado_por_auth_user_id?: string | null
          data_status?: string
          eliminado_en?: string | null
          empresa?: string
          estado?: string
          fuente?: string
          id?: string
          instagram_url?: string | null
          legacy_source_id?: string | null
          motivo_perdida?: string | null
          no_contactar?: boolean
          proxima_accion_en?: string | null
          proxima_accion_tipo?: string | null
          puntaje_prioridad?: number
          region?: string | null
          resumen_personalizacion?: string | null
          rubro?: string | null
          segmento?: string | null
          senal_dolor?: string | null
          sitio_web?: string | null
          telefono?: string | null
          ultimo_contacto_en?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_prospects_converted_organization_id_fkey"
            columns: ["converted_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_prospects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "growth_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_tasks: {
        Row: {
          actualizado_en: string
          completada_en: string | null
          creado_en: string
          creado_por_auth_user_id: string | null
          eliminado_en: string | null
          id: string
          metadata_json: Json
          prioridad: string
          prospect_id: string | null
          tipo: string
          titulo: string
          vence_en: string | null
          workspace_id: string
        }
        Insert: {
          actualizado_en?: string
          completada_en?: string | null
          creado_en?: string
          creado_por_auth_user_id?: string | null
          eliminado_en?: string | null
          id?: string
          metadata_json?: Json
          prioridad?: string
          prospect_id?: string | null
          tipo: string
          titulo: string
          vence_en?: string | null
          workspace_id: string
        }
        Update: {
          actualizado_en?: string
          completada_en?: string | null
          creado_en?: string
          creado_por_auth_user_id?: string | null
          eliminado_en?: string | null
          id?: string
          metadata_json?: Json
          prioridad?: string
          prospect_id?: string | null
          tipo?: string
          titulo?: string
          vence_en?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_tasks_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "growth_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "growth_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_workspace_members: {
        Row: {
          activo: boolean
          actualizado_en: string
          auth_user_id: string
          creado_en: string
          rol: string
          workspace_id: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          auth_user_id: string
          creado_en?: string
          rol?: string
          workspace_id: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          auth_user_id?: string
          creado_en?: string
          rol?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "growth_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_workspaces: {
        Row: {
          actualizado_en: string
          configuracion_json: Json
          creado_en: string
          eliminado_en: string | null
          experimentos_json: Json
          id: string
          metricas_manuales_json: Json
          nombre: string
          slug: string
        }
        Insert: {
          actualizado_en?: string
          configuracion_json?: Json
          creado_en?: string
          eliminado_en?: string | null
          experimentos_json?: Json
          id?: string
          metricas_manuales_json?: Json
          nombre: string
          slug: string
        }
        Update: {
          actualizado_en?: string
          configuracion_json?: Json
          creado_en?: string
          eliminado_en?: string | null
          experimentos_json?: Json
          id?: string
          metricas_manuales_json?: Json
          nombre?: string
          slug?: string
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
      onboarding_checklists: {
        Row: {
          actualizado_en: string
          completed_at: string | null
          completed_by_user_id: number | null
          completion_source: string | null
          creado_en: string
          eliminado_en: string | null
          estado: string
          id: string
          metadata_json: Json
          organization_id: number
          step_key: string
        }
        Insert: {
          actualizado_en?: string
          completed_at?: string | null
          completed_by_user_id?: number | null
          completion_source?: string | null
          creado_en?: string
          eliminado_en?: string | null
          estado?: string
          id?: string
          metadata_json?: Json
          organization_id: number
          step_key: string
        }
        Update: {
          actualizado_en?: string
          completed_at?: string | null
          completed_by_user_id?: number | null
          completion_source?: string | null
          creado_en?: string
          eliminado_en?: string | null
          estado?: string
          id?: string
          metadata_json?: Json
          organization_id?: number
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklists_organization_id_fkey"
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
          billing_period: string
          brand_color: string
          business_hours_note: string | null
          creado_en: string
          empresa_direccion: string | null
          empresa_email: string | null
          empresa_logo_url: string | null
          empresa_nombre: string | null
          empresa_telefono: string | null
          facebook_url: string | null
          final_cta_label: string | null
          final_cta_subtitle: string | null
          final_cta_title: string | null
          form_subtitle: string | null
          form_title: string | null
          forma_pago: string | null
          founder_price_locked: boolean
          hero_image_url: string | null
          hero_mode: string
          hero_subtitle: string | null
          hero_title: string | null
          instagram_url: string | null
          is_published: boolean
          is_test_account: boolean
          jobs_count_label: string | null
          last_payment_at: string | null
          margen_defecto: number | null
          modo_precio_preferido: string
          organization_id: number
          payment_method: string
          plan_code: string
          plan_type: string
          proveedor_preferido: string | null
          public_business_type: string | null
          public_name: string | null
          public_services: string[]
          public_subtitle: string | null
          public_zone: string | null
          rating_label: string | null
          responsable_comercial: string | null
          secondary_color: string | null
          show_gallery: boolean
          show_rating: boolean
          show_schedule: boolean
          solicitud_publica_descripcion_corta: string | null
          solicitud_publica_dias_atencion: string | null
          solicitud_publica_horario_desde: string | null
          solicitud_publica_horario_hasta: string | null
          solicitud_publica_horario_por_dia: Json | null
          solicitud_publica_mensaje_confianza: string | null
          solicitud_publica_privacidad: string | null
          solicitud_publica_slug: string | null
          solicitud_publica_valor: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string
          tiktok_url: string | null
          trial_ends_at: string
          trial_started_at: string
          website_url: string | null
        }
        Insert: {
          actualizado_en?: string
          billing_period?: string
          brand_color?: string
          business_hours_note?: string | null
          creado_en?: string
          empresa_direccion?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_nombre?: string | null
          empresa_telefono?: string | null
          facebook_url?: string | null
          final_cta_label?: string | null
          final_cta_subtitle?: string | null
          final_cta_title?: string | null
          form_subtitle?: string | null
          form_title?: string | null
          forma_pago?: string | null
          founder_price_locked?: boolean
          hero_image_url?: string | null
          hero_mode?: string
          hero_subtitle?: string | null
          hero_title?: string | null
          instagram_url?: string | null
          is_published?: boolean
          is_test_account?: boolean
          jobs_count_label?: string | null
          last_payment_at?: string | null
          margen_defecto?: number | null
          modo_precio_preferido?: string
          organization_id: number
          payment_method?: string
          plan_code?: string
          plan_type?: string
          proveedor_preferido?: string | null
          public_business_type?: string | null
          public_name?: string | null
          public_services?: string[]
          public_subtitle?: string | null
          public_zone?: string | null
          rating_label?: string | null
          responsable_comercial?: string | null
          secondary_color?: string | null
          show_gallery?: boolean
          show_rating?: boolean
          show_schedule?: boolean
          solicitud_publica_descripcion_corta?: string | null
          solicitud_publica_dias_atencion?: string | null
          solicitud_publica_horario_desde?: string | null
          solicitud_publica_horario_hasta?: string | null
          solicitud_publica_horario_por_dia?: Json | null
          solicitud_publica_mensaje_confianza?: string | null
          solicitud_publica_privacidad?: string | null
          solicitud_publica_slug?: string | null
          solicitud_publica_valor?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          tiktok_url?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          website_url?: string | null
        }
        Update: {
          actualizado_en?: string
          billing_period?: string
          brand_color?: string
          business_hours_note?: string | null
          creado_en?: string
          empresa_direccion?: string | null
          empresa_email?: string | null
          empresa_logo_url?: string | null
          empresa_nombre?: string | null
          empresa_telefono?: string | null
          facebook_url?: string | null
          final_cta_label?: string | null
          final_cta_subtitle?: string | null
          final_cta_title?: string | null
          form_subtitle?: string | null
          form_title?: string | null
          forma_pago?: string | null
          founder_price_locked?: boolean
          hero_image_url?: string | null
          hero_mode?: string
          hero_subtitle?: string | null
          hero_title?: string | null
          instagram_url?: string | null
          is_published?: boolean
          is_test_account?: boolean
          jobs_count_label?: string | null
          last_payment_at?: string | null
          margen_defecto?: number | null
          modo_precio_preferido?: string
          organization_id?: number
          payment_method?: string
          plan_code?: string
          plan_type?: string
          proveedor_preferido?: string | null
          public_business_type?: string | null
          public_name?: string | null
          public_services?: string[]
          public_subtitle?: string | null
          public_zone?: string | null
          rating_label?: string | null
          responsable_comercial?: string | null
          secondary_color?: string | null
          show_gallery?: boolean
          show_rating?: boolean
          show_schedule?: boolean
          solicitud_publica_descripcion_corta?: string | null
          solicitud_publica_dias_atencion?: string | null
          solicitud_publica_horario_desde?: string | null
          solicitud_publica_horario_hasta?: string | null
          solicitud_publica_horario_por_dia?: Json | null
          solicitud_publica_mensaje_confianza?: string | null
          solicitud_publica_privacidad?: string | null
          solicitud_publica_slug?: string | null
          solicitud_publica_valor?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          tiktok_url?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          website_url?: string | null
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
      pagos_suscripcion: {
        Row: {
          actualizado_en: string
          amount: number
          amount_clp: number
          billing_period: string
          buy_order: string
          checkout_url: string | null
          creado_en: string
          currency: string
          currency_code: string
          eliminado_en: string | null
          id: number
          organization_id: number
          paid_at: string | null
          payment_provider: string
          period_ends_at: string | null
          period_starts_at: string | null
          plan_code: string
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_response: Json | null
          provider_status: string | null
          provider_token: string | null
          status: string
          subscription_id: number | null
        }
        Insert: {
          actualizado_en?: string
          amount: number
          amount_clp: number
          billing_period: string
          buy_order: string
          checkout_url?: string | null
          creado_en?: string
          currency?: string
          currency_code: string
          eliminado_en?: string | null
          id?: never
          organization_id: number
          paid_at?: string | null
          payment_provider: string
          period_ends_at?: string | null
          period_starts_at?: string | null
          plan_code: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          provider_token?: string | null
          status?: string
          subscription_id?: number | null
        }
        Update: {
          actualizado_en?: string
          amount?: number
          amount_clp?: number
          billing_period?: string
          buy_order?: string
          checkout_url?: string | null
          creado_en?: string
          currency?: string
          currency_code?: string
          eliminado_en?: string | null
          id?: never
          organization_id?: number
          paid_at?: string | null
          payment_provider?: string
          period_ends_at?: string | null
          period_starts_at?: string | null
          plan_code?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_response?: Json | null
          provider_status?: string | null
          provider_token?: string | null
          status?: string
          subscription_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_suscripcion_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_suscripcion_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "suscripciones_organizacion"
            referencedColumns: ["id"]
          },
        ]
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
      public_landing_gallery: {
        Row: {
          creado_en: string
          id: number
          image_url: string
          is_visible: boolean
          label: string | null
          landing_id: number | null
          organization_id: number
          sort_order: number
          work_badge: string | null
          work_title: string | null
          work_type: string | null
          work_zone: string | null
        }
        Insert: {
          creado_en?: string
          id?: never
          image_url: string
          is_visible?: boolean
          label?: string | null
          landing_id?: number | null
          organization_id: number
          sort_order?: number
          work_badge?: string | null
          work_title?: string | null
          work_type?: string | null
          work_zone?: string | null
        }
        Update: {
          creado_en?: string
          id?: never
          image_url?: string
          is_visible?: boolean
          label?: string | null
          landing_id?: number | null
          organization_id?: number
          sort_order?: number
          work_badge?: string | null
          work_title?: string | null
          work_type?: string | null
          work_zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_landing_gallery_landing_id_fkey"
            columns: ["landing_id"]
            isOneToOne: false
            referencedRelation: "organization_profile"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "public_landing_gallery_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_landing_testimonials: {
        Row: {
          actualizado_en: string
          aprobado_en: string | null
          comentario: string
          creado_en: string
          estado: string
          estrellas: number
          id: string
          nombre_corto: string | null
          ocultado_en: string | null
          organization_id: number
        }
        Insert: {
          actualizado_en?: string
          aprobado_en?: string | null
          comentario: string
          creado_en?: string
          estado?: string
          estrellas: number
          id?: string
          nombre_corto?: string | null
          ocultado_en?: string | null
          organization_id: number
        }
        Update: {
          actualizado_en?: string
          aprobado_en?: string | null
          comentario?: string
          creado_en?: string
          estado?: string
          estrellas?: number
          id?: string
          nombre_corto?: string | null
          ocultado_en?: string | null
          organization_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_landing_testimonials_organization_id_fkey"
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
          contactada_at: string | null
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
          contactada_at?: string | null
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
          contactada_at?: string | null
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
      suscripciones_organizacion: {
        Row: {
          actualizado_en: string
          amount: number
          billing_period: string
          cancel_at_period_end: boolean
          cancelled_at: string | null
          country_code: string
          creado_en: string
          currency_code: string
          current_period_ends_at: string | null
          current_period_starts_at: string | null
          eliminado_en: string | null
          external_reference: string
          id: number
          next_payment_at: string | null
          organization_id: number
          plan_code: string
          provider: string
          provider_plan_id: string | null
          provider_status: string | null
          provider_subscription_id: string | null
          status: string
        }
        Insert: {
          actualizado_en?: string
          amount: number
          billing_period: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          country_code?: string
          creado_en?: string
          currency_code?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          eliminado_en?: string | null
          external_reference: string
          id?: never
          next_payment_at?: string | null
          organization_id: number
          plan_code: string
          provider: string
          provider_plan_id?: string | null
          provider_status?: string | null
          provider_subscription_id?: string | null
          status?: string
        }
        Update: {
          actualizado_en?: string
          amount?: number
          billing_period?: string
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          country_code?: string
          creado_en?: string
          currency_code?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          eliminado_en?: string | null
          external_reference?: string
          id?: never
          next_payment_at?: string | null
          organization_id?: number
          plan_code?: string
          provider?: string
          provider_plan_id?: string | null
          provider_status?: string | null
          provider_subscription_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_organizacion_organization_id_fkey"
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
          account_delivered_at: string | null
          account_setup_status: string
          actualizado_en: string | null
          auth_user_id: string | null
          ciudad_comuna: string | null
          correo: string
          creado_en: string | null
          created_by_admin: boolean
          data_sharing_accepted_at: string | null
          eliminado_en: string | null
          id: number
          must_change_password: boolean
          nombre: string | null
          organization_id: number
          password_changed_at: string | null
          rol: string
          whatsapp: string | null
        }
        Insert: {
          account_delivered_at?: string | null
          account_setup_status?: string
          actualizado_en?: string | null
          auth_user_id?: string | null
          ciudad_comuna?: string | null
          correo: string
          creado_en?: string | null
          created_by_admin?: boolean
          data_sharing_accepted_at?: string | null
          eliminado_en?: string | null
          id?: never
          must_change_password?: boolean
          nombre?: string | null
          organization_id: number
          password_changed_at?: string | null
          rol: string
          whatsapp?: string | null
        }
        Update: {
          account_delivered_at?: string | null
          account_setup_status?: string
          actualizado_en?: string | null
          auth_user_id?: string | null
          ciudad_comuna?: string | null
          correo?: string
          creado_en?: string | null
          created_by_admin?: boolean
          data_sharing_accepted_at?: string | null
          eliminado_en?: string | null
          id?: never
          must_change_password?: boolean
          nombre?: string | null
          organization_id?: number
          password_changed_at?: string | null
          rol?: string
          whatsapp?: string | null
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
      activate_subscription_from_payment: {
        Args: { p_payment_id: number }
        Returns: number
      }
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
      complete_google_oauth_account: {
        Args: {
          p_auth_user_id: string
          p_ciudad_comuna: string
          p_consent: boolean
          p_email: string
          p_empresa_nombre: string
          p_nombre: string
          p_whatsapp: string
        }
        Returns: {
          result_account_complete: boolean
          result_already_provisioned: boolean
          result_organization_id: number
          result_trial_ends_at: string
          result_user_id: number
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
  public: {
    Enums: {},
  },
} as const
