import { splitDescriptionChecklistItems } from "../description-checklist";

describe("splitDescriptionChecklistItems", () => {
  it("conserva la numeracion escrita por el maestro en cada linea", () => {
    expect(
      splitDescriptionChecklistItems(
        "10 ventanas correderas segun medidas\n2 ventanas abatibles 120x140"
      )
    ).toEqual([
      "10 ventanas correderas segun medidas",
      "2 ventanas abatibles 120x140",
    ]);
  });

  it("ignora lineas vacias y recorta espacios", () => {
    expect(splitDescriptionChecklistItems("  Primera linea  \n\nSegunda linea  ")).toEqual([
      "Primera linea",
      "Segunda linea",
    ]);
  });
});
