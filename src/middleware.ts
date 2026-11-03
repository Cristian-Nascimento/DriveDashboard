import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha"];
const AUTH_ONLY_GUEST = ["/login", "/cadastro"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.includes(pathname);
  const token = req.cookies.get("pd_session")?.value;

  let valid = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      valid = true;
    } catch {}
  }

  if (!valid && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  if (valid && AUTH_ONLY_GUEST.includes(pathname)) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
