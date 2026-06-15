import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET || "dashboard.mob13r.com";
const S3_BASE_URL = `https://${BUCKET}.s3.ap-south-1.amazonaws.com`;

export async function uploadToS3(file, folder = "uploads") {
  try {
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
    throw new Error("Failed to upload file to S3");
  }
}
