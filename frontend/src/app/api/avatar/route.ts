import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    // Ensure avatars directory exists
    await mkdir(AVATARS_DIR, { recursive: true });

    // Generate filename with userId to avoid collisions
    const ext = file.name.split('.').pop() ?? 'png';
    const filename = `${userId}-${Date.now()}.${ext}`;
    const filepath = path.join(AVATARS_DIR, filename);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const avatarUrl = `/avatars/${filename}`;

    return NextResponse.json({ url: avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
