/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { persistTechnicalCostSnapshot } from "../costo-tecnico-parcial.repository";
import type { TechnicalCostSnapshot } from "../../services/costo-tecnico-parcial.service";

describe("persistTechnicalCostSnapshot", () => {
  it("reemplaza un costo solo por cotización y organización al actualizar precios", async () => {
    const snapshot: TechnicalCostSnapshot = {
      schemaVersion: 2,
      status: "complete",
      priceOrigin: "reference",
      calculatedAt: "2026-10-12T12:00:00.000Z",
      currency: "CLP",
      knownNetTotal: 12345,
      lines: [],
      missing: [],
      assumptions: [],
      sourcePautaCapturedAt: "2026-10-12T11:00:00.000Z",
    };
    const row = { snapshot, estado: "completo", calculado_en: snapshot.calculatedAt };
    const filters: Array<[string, unknown]> = [];
    const query = {} as Record<string, jest.Mock>;
    query.update = jest.fn(() => query);
    query.insert = jest.fn(() => query);
    query.eq = jest.fn((column: string, value: unknown) => { filters.push([column, value]); return query; });
    query.select = jest.fn(() => query);
    query.maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    query.single = jest.fn().mockResolvedValue({ data: row, error: null });
    const from = jest.fn(() => query);
    (createAdminClient as jest.Mock).mockReturnValue({ from });

    const result = await persistTechnicalCostSnapshot({
      quoteId: 1091,
      organizationId: 3,
      snapshot,
      refreshExisting: true,
    });

    expect(from).toHaveBeenCalledWith("cotizacion_costos_tecnicos");
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      estado: "completo",
      snapshot,
      calculado_en: snapshot.calculatedAt,
    }));
    expect(filters).toEqual(expect.arrayContaining([
      ["cotizacion_id", 1091],
      ["organization_id", 3],
    ]));
    expect(query.insert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ snapshot, status: "complete" });
  });
});
