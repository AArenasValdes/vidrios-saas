/** JSON-compatible Supabase value type kept local so Vercel can omit /supabase. */
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

/** Local contract; new organization pricing tables require their separate migration. */
export type SupplierCatalogDatabase = {
  public: {
    Tables: {
      catalogo_proveedores: Table<
        { proveedor_key: string; nombre: string; fabricante: string; creado_en: string },
        { proveedor_key: string; nombre: string; fabricante: string; creado_en?: string }
      >;
      catalogo_fuentes_tecnicas: Table<
        { id: string; proveedor_key: string; emisor: string; revision: string; referencia_fuente: string; importado_en: string },
        { id?: string; proveedor_key: string; emisor: string; revision: string; referencia_fuente: string; importado_en?: string }
      >;
      catalogo_insumos_tecnicos: Table<
        { id: string; fuente_tecnica_id: string; clave_tecnica: string; codigo_fuente: string; nombre: string; material: string; seccion_mm: Json | null; evidencia: Json; creado_en: string },
        { id?: string; fuente_tecnica_id: string; clave_tecnica: string; codigo_fuente: string; nombre: string; material: string; seccion_mm: Json | null; evidencia: Json; creado_en?: string }
      >;
      catalogo_insumo_familias: Table<
        { insumo_tecnico_id: string; family_key: string },
        { insumo_tecnico_id: string; family_key: string }
      >;
      catalogo_presentaciones_proveedor: Table<
        { id: string; proveedor_key: string; fuente_tecnica_id: string; insumo_tecnico_id: string | null; sku_proveedor: string; descripcion: string; modo_acabado: string; acabado_codigo: string | null; acabado_nombre: string | null; unidad_compra: string; largo_comercial_mm: number | null; estado_asociacion: string; evidencia_asociacion: Json | null; creado_en: string },
        { id?: string; proveedor_key: string; fuente_tecnica_id: string; insumo_tecnico_id: string | null; sku_proveedor: string; descripcion: string; modo_acabado: string; acabado_codigo: string | null; acabado_nombre: string | null; unidad_compra: string; largo_comercial_mm: number | null; estado_asociacion: string; evidencia_asociacion: Json | null; creado_en?: string }
      >;
      catalogo_listas_precios: Table<
        { id: string; proveedor_key: string; nombre: string; revision: string; publicado_en: string | null; vigente_desde: string | null; vigente_hasta: string | null; referencia_fuente: string; moneda: string | null; base_precio: string; creado_en: string },
        { id?: string; proveedor_key: string; nombre: string; revision: string; publicado_en: string | null; vigente_desde?: string | null; vigente_hasta: string | null; referencia_fuente: string; moneda: string | null; base_precio: string; creado_en?: string }
      >;
      catalogo_precios_presentacion: Table<
        { id: string; lista_precio_id: string; presentacion_id: string; proveedor_key: string; precio_neto: number; moneda: string | null; evidencia_precio: Json; creado_en: string },
        { id?: string; lista_precio_id: string; presentacion_id: string; proveedor_key: string; precio_neto: number; moneda: string | null; evidencia_precio: Json; creado_en?: string }
      >;
      organizacion_ajustes_proveedor: Table<
        { organization_id: number; proveedor_key: string; ajuste_porcentaje: number; activo: boolean; actualizado_en: string },
        { organization_id: number; proveedor_key: string; ajuste_porcentaje: number; activo?: boolean; actualizado_en?: string }
      >;
      organizacion_precios_presentacion: Table<
        { organization_id: number; presentacion_id: string; precio_neto: number; moneda: string; procedencia: Json | null; actualizado_en: string },
        { organization_id: number; presentacion_id: string; precio_neto: number; moneda: string; procedencia?: Json | null; actualizado_en?: string }
      >;
      organizacion_presentaciones_taller: Table<
        { id: string; organization_id: number; family_key: string; configuration_key: string | null; insumo_oficial_id: string | null; codigo_tecnico: string; codigo_receta: string | null; nombre_perfil: string; sku_taller: string; descripcion: string; modo_acabado: string; acabado_nombre: string | null; unidad_compra: string; largo_comercial_mm: number | null; precio_neto: number | null; moneda: string | null; preferida: boolean; revision: number; creado_por: string | null; creado_en: string; actualizado_en: string; eliminado_en: string | null },
        { id?: string; organization_id: number; family_key: string; configuration_key?: string | null; insumo_oficial_id?: string | null; codigo_tecnico: string; codigo_receta?: string | null; nombre_perfil: string; sku_taller: string; descripcion: string; modo_acabado: string; acabado_nombre?: string | null; unidad_compra: string; largo_comercial_mm?: number | null; precio_neto?: number | null; moneda?: string | null; preferida?: boolean; revision?: number; creado_por?: string | null; creado_en?: string; actualizado_en?: string; eliminado_en?: string | null }
      >;
      cotizacion_costos_tecnicos: Table<
        { id: string; cotizacion_id: number; organization_id: number; estado: string; snapshot: Json; calculado_en: string },
        { id?: string; cotizacion_id: number; organization_id: number; estado: string; snapshot: Json; calculado_en?: string }
      >;
      cotizaciones: Table<
        { id: number; organization_id: number; creado_en: string | null; eliminado_en: string | null; fabricacion_trabajo_snapshot: Json | null },
        { id?: number; organization_id: number; creado_en?: string | null; eliminado_en?: string | null; fabricacion_trabajo_snapshot?: Json | null }
      >;
      cotizacion_items: Table<
        { id: number; codigo: string | null; color: string | null; vidrio: string | null; observaciones: string | null; fabricacion_snapshot: Json | null; cotizacion_id: number; organization_id: number; eliminado_en: string | null },
        { id?: number; codigo?: string | null; color?: string | null; vidrio?: string | null; observaciones?: string | null; fabricacion_snapshot?: Json | null; cotizacion_id: number; organization_id: number; eliminado_en?: string | null }
      >;
      cotizacion_line_templates: Table<
        { id: number; organization_id: number; catalog_key: string | null; eliminado_en: string | null },
        { id?: number; organization_id: number; catalog_key?: string | null; eliminado_en?: string | null }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
