import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromInstanceMetadata } from "@aws-sdk/credential-providers";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

const BUCKET = process.env.S3_BUCKET || "dashboard.mob13r.com";
const REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BASE_URL = `https://s3.${REGION}.amazonaws.com/${BUCKET}`;

const getS3Client = () => {
  // Agar environment variables hain toh use karein (Local development ke liye)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  
  // Elastic Beanstalk IAM Role use karne ke liye
  return new S3Client({
    region: REGION,
    credentials: fromInstanceMetadata({ timeout: 5000, maxRetries: 3 }),
  });
};

export async function uploadToS3(file, folder = "uploads") {
  try {
    if (!file) {
      throw new Error("No file provided for upload.");
    }

    const s3 = getS3Client();
    const ext = path.extname(file.name || "");
    const fileName = `${folder}/${uuidv4()}${ext}`;
    
    // Check if file is in temp path or memory buffer
    const fileBuffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    if (!fileBuffer) {
      throw new Error("File data or temporary path is unreadable.");
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.mimetype || "application/octet-stream",
      // ACL: "public-read" -> Removed to prevent 403 Access Denied errors on modern AWS buckets
    });

    await s3.send(command);
    return `${S3_BASE_URL}/${fileName}`;
  } catch (err) {
    console.error("S3 Upload Service Error:", err);
    throw new Error(`Failed to upload file to S3: ${err.message}`);
  }
}
