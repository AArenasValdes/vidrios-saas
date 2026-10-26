/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { TrustedWorkshopsSection } from "../trusted-workshops-section";

describe("TrustedWorkshopsSection", () => {
  it("renders the section title, all 4 workshop logos, 5-star ratings, and quotes", () => {
    render(<TrustedWorkshopsSection />);

    expect(
      screen.getByRole("heading", {
        name: /empresas y talleres que cotizan con ventora/i,
      })
    ).toBeInTheDocument();

    const expectedWorkshops = [
      "Vidriería FyH",
      "Dimasoli Ventanas",
      "San Marco Aluminios y PVC",
      "KR Metal Limitada",
    ];

    for (const name of expectedWorkshops) {
      expect(
        screen.getByRole("img", { name: new RegExp(`Logo de ${name}`, "i") })
      ).toBeInTheDocument();
      expect(screen.getByText(name)).toBeInTheDocument();
    }

    expect(
      screen.getByText(/cumple perfecto con lo que buscaba para hacer cotizaciones/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/me facilitó mucho el trabajo, súper práctica y rápida/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/me encantó, era lo que buscaba y además en el teléfono/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nos encantó el programa, súper práctico y fácil hacer presupuestos/i)
    ).toBeInTheDocument();

    const starRatings = screen.getAllByLabelText(/calificación de 5 de 5 estrellas/i);
    expect(starRatings).toHaveLength(4);
  });

  it("points to the optimized webp images", () => {
    render(<TrustedWorkshopsSection />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(4);

    const sources = images.map((img) => img.getAttribute("src"));
    expect(sources.some((src) => src?.includes("vidrieria-fyh.webp"))).toBe(true);
    expect(sources.some((src) => src?.includes("dimasoli.webp"))).toBe(true);
    expect(sources.some((src) => src?.includes("krmetal.webp"))).toBe(true);
    expect(sources.some((src) => src?.includes("san-marco.webp"))).toBe(true);
  });
});
