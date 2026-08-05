import type { DefaultSession } from "next-auth";
import type { PartyType, UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: UserRole;
    organizationId: string;
    partyType: PartyType;
    organizationName: string;
    jobTitle: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      organizationId: string;
      partyType: PartyType;
      organizationName: string;
      jobTitle: string;
      email: string | null | undefined;
      name: string | null | undefined;
      image: string | null | undefined;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId: string;
    partyType: PartyType;
    organizationName: string;
    jobTitle: string;
  }
}
