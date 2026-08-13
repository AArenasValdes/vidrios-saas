import {
  isValidLatamMobilePhone,
  normalizeLatamMobilePhone,
} from "../latam-mobile-phone";

describe("latam-mobile-phone", () => {
  it("normaliza Chile local y E.164", () => {
    expect(normalizeLatamMobilePhone("9 8765 4321", "CL")).toBe("+56987654321");
    expect(normalizeLatamMobilePhone("+56 9 8765 4321", "CL")).toBe("+56987654321");
  });

  it("acepta mercados Latam", () => {
    expect(normalizeLatamMobilePhone("+52 55 1234 5678", "MX")).toBe("+525512345678");
    expect(normalizeLatamMobilePhone("912 345 678", "PE")).toBe("+51912345678");
    expect(isValidLatamMobilePhone("+57 300 123 4567", "CO")).toBe(true);
  });

  it("rechaza valores cortos", () => {
    expect(normalizeLatamMobilePhone("123", "CL")).toBeNull();
    expect(isValidLatamMobilePhone("123", "AR")).toBe(false);
  });
});
