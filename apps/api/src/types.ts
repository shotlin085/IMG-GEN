export type Request = {
  cookies?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | undefined>;
  params: Record<string, string>;
  body: unknown;
};

export type Reply = {
  setCookie: (name: string, value: string, options?: Record<string, unknown>) => void;
  clearCookie: (name: string, options?: Record<string, unknown>) => void;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  onboardedAt: Date | null;
};

export type AuthedRequest = Request & {
  user?: SessionUser;
};
