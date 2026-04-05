import { Client as MinIOClient } from 'minio'
import { Readable } from 'stream'

const globalForMinio = globalThis as unknown as { minioClient: MinIOClient }

function createMinIOClient(): MinIOClient {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const useSSL = process.env.MINIO_USE_SSL === 'true'

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      'MinIO configuration is incomplete. Please set MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY.'
    )
  }

  return new MinIOClient({
    endPoint: endpoint,
    accessKey: accessKey,
    secretKey: secretKey,
    useSSL: useSSL,
  })
}

export const minioClient =
  globalForMinio.minioClient ||
  (() => {
    try {
      return createMinIOClient()
    } catch (error) {
      console.error('Failed to create MinIO client:', error)
      throw error
    }
  })()

if (process.env.NODE_ENV !== 'production') {
  globalForMinio.minioClient = minioClient
}

/**
 * Ensures that a bucket exists in MinIO, creating it if necessary
 */
export async function ensureBucket(bucketName: string): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(bucketName)
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1')
      console.log(`Created MinIO bucket: ${bucketName}`)
    }
  } catch (error) {
    console.error(`Failed to ensure bucket ${bucketName}:`, error)
    throw error
  }
}

/**
 * Uploads a file to MinIO
 */
export async function uploadFile(
  bucketName: string,
  fileName: string,
  buffer: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  try {
    await ensureBucket(bucketName)
    const stream = Readable.from(buffer)
    await minioClient.putObject(bucketName, fileName, stream, buffer.length, {
      'Content-Type': contentType,
    })
  } catch (error) {
    console.error(`Failed to upload file ${fileName}:`, error)
    throw error
  }
}

/**
 * Gets a download URL for a file in MinIO
 */
export async function getFileUrl(
  bucketName: string,
  fileName: string,
  expirySeconds: number = 24 * 60 * 60 // 24 hours default
): Promise<string> {
  try {
    const url = await minioClient.presignedGetObject(
      bucketName,
      fileName,
      expirySeconds
    )
    return url
  } catch (error) {
    console.error(`Failed to get URL for file ${fileName}:`, error)
    throw error
  }
}

/**
 * Deletes a file from MinIO
 */
export async function deleteFile(
  bucketName: string,
  fileName: string
): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, fileName)
  } catch (error) {
    console.error(`Failed to delete file ${fileName}:`, error)
    throw error
  }
}

/**
 * Checks if a file exists in MinIO
 */
export async function fileExists(
  bucketName: string,
  fileName: string
): Promise<boolean> {
  try {
    await minioClient.statObject(bucketName, fileName)
    return true
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false
    }
    console.error(`Failed to check file existence ${fileName}:`, error)
    throw error
  }
}
