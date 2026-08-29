import "server-only";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DOWNLOAD_URL_EXPIRY_SECONDS = 300; // 5 minutos — spec exige URL de expiração curta

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
    },
  });
}

export async function getSignedDownloadUrl(storageKey: string): Promise<string> {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) {
    throw new Error("STORAGE_BUCKET não configurado");
  }

  const command = new GetObjectCommand({ Bucket: bucket, Key: storageKey });
  return getSignedUrl(getClient(), command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS });
}
