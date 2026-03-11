declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      JWT_SECRET: string;
      JWT_EXPIRE: string;
      PORT: string;
      NODE_ENV: string;
    }
  }
}
export {};
