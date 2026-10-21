import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { can, getCurrentUser } from '@/lib/auth'
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from '@/lib/storage'

/** Issues short-lived tokens so the browser uploads straight to Vercel Blob (no 4.5 MB function limit). */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser()
        if (!user || !can(user, 'upload')) throw new Error('Not authorized')
        return {
          allowedContentTypes: Object.keys(ALLOWED_TYPES),
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          tokenPayload: JSON.stringify({ userId: user.id }),
        }
      },
      // The media row is registered by the editor right after upload (works locally too).
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 400 })
  }
}
