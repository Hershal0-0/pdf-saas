// import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
// import { NextRequest } from "next/server";

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { kindeAuth: string } }
// ) {
//   const endpoint = params.kindeAuth;
//   return handleAuth(request, endpoint);
// }

import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { kindeAuth: string } }
) {
  const endpoint = params.kindeAuth;
  const response = await handleAuth(request, endpoint);

  if (response instanceof Response) {
    return response;
  }

  return new Response("Internal Server Error", { status: 500 });
}
