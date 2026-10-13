import { defineConfig } from "drizzle-kit";

// `npm run db:generate` writes SQL migrations to drizzle/. Commit them: the app
// applies them on first database access (src/db/client.ts).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
