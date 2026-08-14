import { findActiveUserProfile } from "../active-user-profile.service";

describe("findActiveUserProfile", () => {
  it("no usa correo como fallback cuando existe una identidad Auth", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      maybeSingle,
    };
    const supabase = { from: jest.fn().mockReturnValue(query) } as never;

    await expect(
      findActiveUserProfile(supabase, {
        authUserId: "auth-new",
        email: "legacy@test.com",
      })
    ).resolves.toBeNull();

    expect(query.eq).toHaveBeenCalledWith("auth_user_id", "auth-new");
    expect(query.ilike).not.toHaveBeenCalled();
  });
});
