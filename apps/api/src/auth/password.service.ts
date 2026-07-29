import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MiB, OWASP-recommended minimum for argon2id in 2024+
    timeCost: 2,
    parallelism: 1,
  };

  async hash(plainTextPassword: string): Promise<string> {
    return argon2.hash(plainTextPassword, this.options);
  }

  async verify(hash: string, plainTextPassword: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainTextPassword);
    } catch {
      // Malformed hash or verification error — treat as a failed match, never throw.
      return false;
    }
  }
}
