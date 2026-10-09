import {
  ApiError,
  getBlob,
  getJson,
  sendJson,
  setAccessToken,
  setUnauthorizedHandler,
} from "./client";

describe("cliente de la API", () => {
  afterEach(() => setAccessToken(null));

  it("envía el token en memoria y JSON", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    setAccessToken("abc");
    await expect(sendJson("POST", "/api/v1/x", { a: 1 })).resolves.toEqual({ ok: true });
    const init = fetchMock.mock.calls[0]![1]!;
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer abc");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("traduce los errores problem+json y cierra la sesión con 401", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken("vencido");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "UNAUTHORIZED", detail: "Sesión inválida" }), {
        status: 401,
      }),
    );
    const error = await getJson("/api/v1/cameras").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("UNAUTHORIZED");
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it("descarga archivos y acepta respuestas vacías", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response("pdf", { status: 200 }),
    );
    expect((await getBlob("/api/v1/reports/export")).size).toBe(3);
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("", { status: 200 }));
    await expect(sendJson("POST", "/api/v1/models/rollback")).resolves.toBeUndefined();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response("x", { status: 500 }),
    );
    await expect(getJson("/x")).rejects.toMatchObject({ code: "HTTP_500" });
  });
});
