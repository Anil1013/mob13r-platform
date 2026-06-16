import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromInstanceMetadata } from "@aws-sdk/credential-providers";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

const BUCKET = process.env.S3_BUCKET || "dashboard.mob13r.com";
const REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BASE_URL = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

const getS3Client = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return new S3Client({
    region: REGION,
    credentials: fromInstanceMetadata({ timeout: 5000, maxRetries: 3 }),
  });
};

export async function uploadToS3(file, folder = "uploads") {
  try {
    const s3 = getS3Client();
    const ext = path.extname(file.name);
    const fileName = `${folder}/${uuidv4()}${ext}`;
    const fileBuffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    });
    await s3.send(command);
    return `${S3_BASE_URL}/${fileName}`;
  } catch (err) {
    console.error("S3 Upload Error:", err);
    throw new Error("Failed to upload file to S3: " + err.message);
  }
}
