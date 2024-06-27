import { db } from "@/db";
import { pinecone } from "@/lib/pinecone";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { PLANS } from "@/config/stripe";

const f = createUploadthing();

const middleware = async () => {
  // This code runs on your server before upload

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // If you throw, the user will not be able to upload
  if (!user || !user.id) throw new UploadThingError("Unauthorized");

  const subscriptionPlan = await getUserSubscriptionPlan();

  // Whatever is returned here is accessible in onUploadComplete as `metadata`
  return {
    userId: user.id,
    subscriptionPlan,
  };
};

const onUploadComplete = async ({
  metadata,
  file,
}: {
  metadata: Awaited<ReturnType<typeof middleware>>;
  file: {
    key: string;
    name: string;
    url: string;
  };
}) => {
  const isFileExists = await db.file.findFirst({
    where: {
      key: file.key,
    },
  });
  if (isFileExists) {
    return;
  }
  // This code RUNS ON YOUR SERVER after upload
  // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
  const createdFile = await db.file.create({
    data: {
      userId: metadata.userId,
      key: file.key,
      name: file.name,
      // url: `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`,
      url: file.url,
      uploadStatus: "PROCESSING",
    },
  });
  try {
    const response = await fetch(file.url);
    const blob = await response.blob();
    const loader = new PDFLoader(blob);

    const pageLevelDocs = await loader.load();
    const pagesAmt = pageLevelDocs.length;

    const { subscriptionPlan } = metadata;
    const { isSubscribed } = subscriptionPlan;
    const isProExceeded =
      pagesAmt > PLANS.find((plan) => plan.name === "Pro")!.pagesPerPdf;
    const isFreeExceeded =
      pagesAmt > PLANS.find((plan) => plan.name === "Free")!.pagesPerPdf;

    if ((isSubscribed && isProExceeded) || (!isSubscribed && isFreeExceeded)) {
      await db.file.update({
        data: {
          uploadStatus: "FAILED",
        },
        where: {
          id: createdFile.id,
        },
      });
    }

    // vectorize and index entire document
    const pineconeIndex = pinecone.index("quill-bot");
    // console.log(pineconeIndex);
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const pinecone_res = await PineconeStore.fromDocuments(
      pageLevelDocs,
      embeddings,
      {
        pineconeIndex,
        namespace: createdFile.id,
      }
    );

    console.log(pinecone_res);

    await db.file.update({
      where: {
        id: createdFile.id,
      },
      data: {
        uploadStatus: "SUCCESS",
      },
    });
  } catch (error) {
    await db.file.update({
      where: {
        id: createdFile.id,
      },
      data: {
        uploadStatus: "FAILED",
      },
    });
  }
};

export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  freePlanUploader: f({ pdf: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
  proPlanUploader: f({ pdf: { maxFileSize: "16MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
