import pg from "pg";
import { configDotenv } from "dotenv";
configDotenv();

const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL,
});

export default pool;
