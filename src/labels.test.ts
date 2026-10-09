import { dateTime, duration, secondsBetween, stayMessage } from "./labels";

describe("lenguaje claro", () => {
  it("formatea duraciones", () => {
    expect(duration(45)).toBe("45 s");
    expect(duration(120)).toBe("2 min");
    expect(duration(3600)).toBe("1 h");
    expect(duration(3900)).toBe("1 h 5 min");
    expect(duration(-3)).toBe("0 s");
  });

  it("describe la permanencia como en el documento", () => {
    expect(stayMessage("CAR", "ABC123", 120, "Zona amarilla")).toBe(
      "Carro ABC123 lleva 2 min en zona amarilla",
    );
    expect(stayMessage("OTRO", undefined, 30, "Andén")).toBe("Vehículo lleva 30 s en andén");
  });

  it("calcula segundos y fechas", () => {
    expect(secondsBetween("2026-10-05T15:00:00Z", "2026-10-05T15:00:11Z")).toBe(11);
    expect(secondsBetween(undefined, "2026-10-05T15:00:11Z")).toBe(0);
    expect(dateTime(undefined)).toBe("—");
    expect(dateTime("2026-10-05T15:00:00Z")).toContain("2026");
  });
});
