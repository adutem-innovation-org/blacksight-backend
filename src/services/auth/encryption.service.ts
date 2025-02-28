import bcrypt from "bcryptjs";

export class EncryptionService {
  async compare(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async hash(plain: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plain, salt);
    return hash;
  }
}
