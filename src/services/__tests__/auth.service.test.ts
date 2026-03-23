import { createAuthService } from "../auth.service";
import type { AuthRepository } from "@/repositories/auth.repository";
import type { User } from "@supabase/supabase-js";

function createRepositoryMock(): jest.Mocked<AuthRepository> {
  return {
    getAuthenticatedUser: jest.fn(),
    getUserProfile: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    subscribeToAuthStateChange: jest.fn(),
  };
}

function createUser(email = "dueno@vidrios.cl") {
  return {
    id: "user-1",
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-03-12T00:00:00.000Z",
  } as User;
}

describe("authService", () => {
  it("debe retornar estado vacio cuando no hay usuario autenticado", async () => {
    const repository = createRepositoryMock();
    repository.getAuthenticatedUser.mockResolvedValue(null);

    const service = createAuthService({ repository });
    const resultado = await service.getCurrentAuthState();

    expect(resultado).toEqual({
      user: null,
      organizacionId: null,
      rol: null,
    });
    expect(repository.getUserProfile).not.toHaveBeenCalled();
  });

  it("debe cargar perfil y organizacion cuando existe sesion activa", async () => {
    const repository = createRepositoryMock();
    const user = createUser();

    repository.getAuthenticatedUser.mockResolvedValue(user);
    repository.getUserProfile.mockResolvedValue({
      organizacionId: 17,
      rol: "admin",
    });

    const service = createAuthService({ repository });
    const resultado = await service.getCurrentAuthState();

    expect(repository.getUserProfile).toHaveBeenCalledWith("dueno@vidrios.cl");
    expect(resultado).toEqual({
      user,
      organizacionId: 17,
      rol: "admin",
    });
  });

  it("debe reintentar el bootstrap cuando la organizacion todavia no aparece en el primer intento", async () => {
    const repository = createRepositoryMock();
    const user = createUser();

    repository.getAuthenticatedUser.mockResolvedValue(user);
    repository.getUserProfile
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        organizacionId: 17,
        rol: "admin",
      });

    const service = createAuthService({
      repository,
      bootstrapRetryCount: 1,
      bootstrapRetryDelayMs: 0,
    });
    const resultado = await service.getCurrentAuthState();

    expect(repository.getAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(repository.getUserProfile).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({
      user,
      organizacionId: 17,
      rol: "admin",
    });
  });

  it("debe lanzar error si el usuario autenticado no tiene correo", async () => {
    const repository = createRepositoryMock();
    repository.getAuthenticatedUser.mockResolvedValue(createUser("") as User);

    const service = createAuthService({ repository });

    await expect(service.getCurrentAuthState()).rejects.toThrow(
      "El usuario autenticado no tiene correo"
    );
  });

  it("debe normalizar el correo antes de iniciar sesion", async () => {
    const repository = createRepositoryMock();
    repository.signInWithPassword.mockResolvedValue();

    const service = createAuthService({ repository });

    await service.signIn({
      email: "  ADMIN@VIDRIOS.CL ",
      password: "secreta123",
    });

    expect(repository.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@vidrios.cl",
      password: "secreta123",
    });
  });

  it("debe lanzar error si el correo viene vacio", async () => {
    const repository = createRepositoryMock();
    const service = createAuthService({ repository });

    await expect(
      service.signIn({
        email: "   ",
        password: "secreta123",
      })
    ).rejects.toThrow("El correo es obligatorio");
  });
});
