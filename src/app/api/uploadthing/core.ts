import { db } from "@/db";
import { pinecone } from "@/lib/pinecone";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const f = createUploadthing();

export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({ pdf: { maxFileSize: "16MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload

      const { getUser } = getKindeServerSession();
      const user = await getUser();

      // If you throw, the user will not be able to upload
      if (!user || !user.id) throw new UploadThingError("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return {
        userId: user.id,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
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
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
