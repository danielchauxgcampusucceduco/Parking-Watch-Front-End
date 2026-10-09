import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// El primer render de cada archivo (en frío) puede tardar más de 1 s en máquinas lentas.
configure({ asyncUtilTimeout: 5000 });

// jsdom no implementa URL.createObjectURL (fotos y descargas).
URL.createObjectURL ??= () => "blob:prueba";
URL.revokeObjectURL ??= () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
