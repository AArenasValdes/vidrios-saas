/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { GlassSheetFormatDialog } from "../glass-sheet-format-dialog";

describe("GlassSheetFormatDialog", () => {
  it("no se muestra cuando open es false", () => {
    render(<GlassSheetFormatDialog open={false} onOpenChange={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.queryByText("Formato de plancha de vidrio")).not.toBeInTheDocument();
  });

  it("permite ingresar ancho y alto y enviar las dimensiones", () => {
    const handleSubmit = jest.fn();
    render(<GlassSheetFormatDialog open={true} onOpenChange={jest.fn()} onSubmit={handleSubmit} />);

    expect(screen.getByText("Formato de plancha de vidrio")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Esta medida se usará para esta descarga sin guardarla como configuración permanente."
      )
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", { name: "Descargar PDF" });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Ancho de plancha (mm)"), {
      target: { value: "2500" },
    });
    fireEvent.change(screen.getByLabelText("Alto de plancha (mm)"), {
      target: { value: "1800" },
    });

    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledWith({ widthMm: 2500, heightMm: 1800 });
  });

  it("deshabilita los controles mientras se procesa", () => {
    render(
      <GlassSheetFormatDialog
        open={true}
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting={true}
      />
    );

    expect(screen.getByRole("button", { name: "Generando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});
