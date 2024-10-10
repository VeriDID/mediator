import dotenv from "dotenv";
import type { AskarWalletPostgresStorageConfig } from "@credo-ts/askar/build/wallet";

dotenv.config();

export const askarPostgresConfig = (): AskarWalletPostgresStorageConfig => {
  const host = process.env.POSTGRES_HOST;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;

  if (!host || !user || !password) {
    throw new Error(
      "Missing required PostgreSQL configuration in environment variables"
    );
  }

  return {
    type: "postgres",
    config: {
      host,
      connectTimeout: 10,
    },
    credentials: {
      account: user,
      password: password,
      adminAccount: user,
      adminPassword: password,
    },
  };
};
