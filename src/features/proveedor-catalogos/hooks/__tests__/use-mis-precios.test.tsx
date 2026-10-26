/** @jest-environment jsdom */
import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMisPrecios } from "../use-mis-precios";
import { loadMyPrices, saveMyPriceChange } from "../../services/mis-precios.client.service";

jest.mock("../../services/mis-precios.client.service", () => ({
  loadMyPrices: jest.fn(),
  saveMyPriceChange: jest.fn(),
}));

const original = { providers: [{ providerKey: "alumco", providerName: "Alumco", revision: "2026", percentage: 0, presentations: [] }] };
const discounted = { providers: [{ ...original.providers[0], percentage: -10 }] };

beforeEach(() => { jest.resetAllMocks(); });

it("realiza una sola carga inicial al montar con Strict Mode", async () => {
  (loadMyPrices as jest.Mock).mockResolvedValue(original);
  const { result } = renderHook(() => useMisPrecios(), { wrapper: StrictMode });
  await waitFor(() => expect(result.current.catalog).toEqual(original));
  expect(loadMyPrices).toHaveBeenCalledTimes(1);
});

it("vuelve a leer los precios privados al guardar un descuento y al volver a entrar", async () => {
  (loadMyPrices as jest.Mock).mockResolvedValueOnce(original).mockResolvedValue(discounted);
  (saveMyPriceChange as jest.Mock).mockResolvedValue(undefined);
  const first = renderHook(() => useMisPrecios(), { wrapper: StrictMode });
  await waitFor(() => expect(first.result.current.catalog).toEqual(original));
  await act(async () => {
    expect(await first.result.current.save({ kind: "adjustment", providerKey: "alumco", percentage: -10 })).toBe(true);
  });
  expect(first.result.current.catalog).toEqual(discounted);
  first.unmount();
  const second = renderHook(() => useMisPrecios(), { wrapper: StrictMode });
  await waitFor(() => expect(second.result.current.catalog).toEqual(discounted));
  expect(loadMyPrices).toHaveBeenCalledTimes(3);
});

it("permite recuperar una carga fallida mediante refresh", async () => {
  (loadMyPrices as jest.Mock).mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValue(original);
  const { result } = renderHook(() => useMisPrecios(), { wrapper: StrictMode });
  await waitFor(() => expect(result.current.error).toBe("Sin conexión"));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.error).toBeNull();
  expect(result.current.catalog).toEqual(original);
});
