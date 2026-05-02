"use client";

import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";

import type { Cliente } from "@/features/clientes/types/cliente";
import { SOLICITUD_PREFILL_CLIENT_ID_PREFIX } from "@/features/cotizaciones/new-quote/solicitud-prefill";

type UsePasoUnoClienteParams = {
  clientes: Cliente[];
  clientQuery: string;
  selectedClientId: string;
  draftClienteNombre: string;
  draftClienteTelefono: string;
  draftDireccion: string;
  onClientQueryChange: (value: string) => void;
  onSelectClient: (clientId: string) => void;
  onAplicarClienteSeleccionado: (cliente: Cliente) => void;
};

export function usePasoUnoCliente(params: UsePasoUnoClienteParams) {
  const {
    clientes,
    clientQuery,
    selectedClientId,
    draftClienteNombre,
    draftClienteTelefono,
    draftDireccion,
    onClientQueryChange,
    onSelectClient,
    onAplicarClienteSeleccionado,
  } = params;
  const ultimoClienteAplicadoRef = useRef<string | number | null>(null);
  const isSolicitudPrefillSelected = selectedClientId.startsWith(
    SOLICITUD_PREFILL_CLIENT_ID_PREFIX
  );

  const clienteSolicitudPrefill = useMemo<Cliente | null>(() => {
    if (!isSolicitudPrefillSelected || !draftClienteNombre.trim()) {
      return null;
    }

    return {
      id: selectedClientId,
      organizationId: "prefill",
      nombre: draftClienteNombre.trim(),
      telefono: draftClienteTelefono.trim() || null,
      direccion: draftDireccion.trim() || null,
      correo: null,
      creadoEn: null,
      actualizadoEn: null,
      eliminadoEn: null,
    };
  }, [
    draftDireccion,
    draftClienteNombre,
    draftClienteTelefono,
    isSolicitudPrefillSelected,
    selectedClientId,
  ]);

  const clientesFiltrados = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clientes.slice(0, 6);
    return clientes
      .filter((cliente) => {
        const haystack =
          `${cliente.nombre ?? ""} ${cliente.telefono ?? ""} ${cliente.direccion ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6);
  }, [clientQuery, clientes]);

  const clientesRecientes = useMemo(() => {
    if (!clienteSolicitudPrefill) {
      return clientes.slice(0, 8);
    }

    return [
      clienteSolicitudPrefill,
      ...clientes.filter((cliente) => String(cliente.id) !== selectedClientId),
    ].slice(0, 8);
  }, [clienteSolicitudPrefill, clientes, selectedClientId]);
  const clientesRecientesMovil = useMemo(() => clientesRecientes.slice(0, 4), [clientesRecientes]);

  const clienteSeleccionado = useMemo(
    () =>
      clientes.find((cliente) => String(cliente.id) === selectedClientId) ??
      clienteSolicitudPrefill,
    [clienteSolicitudPrefill, clientes, selectedClientId]
  );

  const estadoBusquedaCliente = useMemo(() => {
    if (clienteSeleccionado) {
      return "Trabajando con un cliente ya guardado.";
    }

    if (clientQuery.trim() !== "" && clientesFiltrados.length === 0) {
      return "No encontramos ese cliente. Puedes crear uno nuevo ahora.";
    }

    return "Busca un cliente o completa los datos para crear uno nuevo.";
  }, [clientQuery, clienteSeleccionado, clientesFiltrados.length]);

  useEffect(() => {
    if (!clienteSeleccionado) {
      ultimoClienteAplicadoRef.current = null;
      return;
    }

    if (ultimoClienteAplicadoRef.current === clienteSeleccionado.id) {
      return;
    }

    ultimoClienteAplicadoRef.current = clienteSeleccionado.id;
    onAplicarClienteSeleccionado(clienteSeleccionado);
    onClientQueryChange(clienteSeleccionado.nombre);
  }, [clienteSeleccionado, onAplicarClienteSeleccionado, onClientQueryChange]);

  const manejarEnterBusquedaCliente = useCallback(
    (
      event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
      onContinuarConClienteSeleccionado: () => void
    ) => {
      if (clientQuery.trim() !== "" && clientesFiltrados.length > 0 && !clienteSeleccionado) {
        event.preventDefault();
        onSelectClient(String(clientesFiltrados[0].id));
        return true;
      }

      if (clienteSeleccionado) {
        event.preventDefault();
        onContinuarConClienteSeleccionado();
        return true;
      }

      return false;
    },
    [clientQuery, clienteSeleccionado, clientesFiltrados, onSelectClient]
  );

  return {
    clienteSeleccionado,
    clientesFiltrados,
    clientesRecientes,
    clientesRecientesMovil,
    estadoBusquedaCliente,
    manejarEnterBusquedaCliente,
  };
}
