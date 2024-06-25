// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { trpc } from "../_trpc/client";
// import { TRPCError } from "@trpc/server";
// import { Loader2 } from "lucide-react";

// const Page = () => {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const origin = searchParams.get("origin");

//   const { data, isLoading, error } = trpc.authCallback.useQuery(undefined, {
//     retry: true,
//     retryDelay: 500,
//   });

//   if (data?.success) {
//     router.push(origin ? `/${origin}` : "/dashboard");
//   }
//   // check if data contains error
//   if (error?.data?.code === "UNAUTHORIZED") {
//     router.push("/sign-in");
//   }

//   return (
//     <div className="w-full mt-24 flex justify-center">
//       <div className="flex flex-col items-center gap-2">
//         <Loader2 className="h-8 w-8 animate-spin text-zinc-800 " />
//         <h3 className="font-semibold text-xl">Setting Up Your Account...</h3>
//         <p>Your will be redirected automatically</p>
//       </div>
//     </div>
//   );
// };
// export default Page;

"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../_trpc/client";
import { Loader2 } from "lucide-react";
import { useEffect, Suspense } from "react";

const AuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin");

  const { data, isLoading, error } = trpc.authCallback.useQuery(undefined, {
    retry: true,
    retryDelay: 500,
  });

  useEffect(() => {
    if (data?.success) {
      router.push(origin ? `/${origin}` : "/dashboard");
    } else if (error?.data?.code === "UNAUTHORIZED") {
      router.push("/sign-in");
    }
  }, [data, error, origin, router]);

  return (
    <div className="w-full mt-24 flex justify-center">
      <div className="flex flex-col items-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
            <h3 className="font-semibold text-xl">
              Setting Up Your Account...
            </h3>
            <p>You will be redirected automatically</p>
          </>
        ) : error ? (
          <p className="text-red-500">An error occurred: {error.message}</p>
        ) : (
          <p>Redirecting...</p>
        )}
      </div>
    </div>
  );
};

const Page = () => {
  return (
    <Suspense
      fallback={<Loader2 className="h-8 w-8 animate-spin text-zinc-800" />}
    >
      <AuthCallbackPage />
    </Suspense>
  );
};

export default Page;
