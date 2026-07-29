import { PasswordService } from "../password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("hashes a password to a non-plaintext argon2id string", async () => {
    const hash = await service.hash("correct horse battery staple");
    expect(hash).not.toEqual("correct horse battery staple");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await service.hash("correct horse battery staple");
    await expect(service.verify(hash, "correct horse battery staple")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await service.hash("correct horse battery staple");
    await expect(service.verify(hash, "wrong password")).resolves.toBe(false);
  });

  it("never throws on a malformed hash — returns false instead", async () => {
    await expect(service.verify("not-a-real-hash", "anything")).resolves.toBe(false);
  });

  it("produces a different hash for the same password each time (random salt)", async () => {
    const hashA = await service.hash("same password");
    const hashB = await service.hash("same password");
    expect(hashA).not.toEqual(hashB);
  });
});
