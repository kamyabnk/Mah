import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/auth/admin-auth";

const ADMIN_PATH = /^\/(en|fa)\/admin(\/|$)/;
const ADMIN_LOGIN_PATH = /^\/(en|fa)\/admin\/login\/?$/;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ADMIN_PATH.test(pathname) && !ADMIN_LOGIN_PATH.test(pathname)) {
    const session = await adminAuth();
    if (!session?.user) {
      const locale = pathname.split("/")[1];
      return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
