import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id: string;
      role: string;
      adminLevel?: string;
      mustChangePassword?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
    adminLevel?: string;
    mustChangePassword?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    adminLevel?: string;
    mustChangePassword?: boolean;
  }
}
