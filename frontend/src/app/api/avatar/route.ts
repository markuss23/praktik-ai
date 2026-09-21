import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');
// Přípona se odvozuje ze skutečného MIME typu, ne z názvu souboru od klienta —
// jinak by šlo uložit `.js`/`.html` do veřejně servírované složky.
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
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

    const ext = EXT_BY_TYPE[file.type];
    if (!ext) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    // Ensure avatars directory exists
    await mkdir(AVATARS_DIR, { recursive: true });

    // Název generujeme sami. `userId` přichází z těla requestu, takže se do
    // cesty nesmí dostat — jinak by `../..` v něm umožnilo zápis mimo složku.
    const filename = `${randomUUID()}.${ext}`;
    const filepath = path.resolve(AVATARS_DIR, filename);
    if (!filepath.startsWith(AVATARS_DIR + path.sep)) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

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
