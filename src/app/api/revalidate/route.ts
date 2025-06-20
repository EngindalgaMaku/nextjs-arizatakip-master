import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Güvenlik için bir secret token belirleyin. Bu token .env.local dosyanızda olmalı.
// Örneğin: REVALIDATE_SECRET_TOKEN=your_super_secret_token
const REVALIDATE_TOKEN = process.env.REVALIDATE_SECRET_TOKEN;

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  const body = await request.json();
  const path = body.path as string | undefined;
  const tag = body.tag as string | undefined;

  if (secret !== REVALIDATE_TOKEN) {
    console.warn('Invalid revalidation secret:', secret);
    return NextResponse.json({ revalidated: false, now: Date.now(), message: 'Invalid token' }, { status: 401 });
  }

  if (!path && !tag) {
    return NextResponse.json(
      { revalidated: false, now: Date.now(), message: 'Missing path or tag to revalidate' }, 
      { status: 400 }
    );
  }

  const revalidatedItems: string[] = [];
  const errors: string[] = [];

  if (path) {
    try {
      revalidatePath(path);
      revalidatedItems.push(`path: ${path}`);
      console.log(`Revalidated path: ${path}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error revalidating path ${path}:`, errorMessage);
      errors.push(`Error revalidating path ${path}: ${errorMessage}`);
    }
  }

  if (tag) {
    try {
      revalidateTag(tag);
      revalidatedItems.push(`tag: ${tag}`);
      console.log(`Revalidated tag: ${tag}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error revalidating tag ${tag}:`, errorMessage);
      errors.push(`Error revalidating tag ${tag}: ${errorMessage}`);
    }
  }
  
  if (errors.length > 0) {
    return NextResponse.json(
        { revalidated: false, now: Date.now(), message: `Revalidation failed for some items.`, errors, revalidatedItems }, 
        { status: 500 }
    );
  }

  return NextResponse.json({ revalidated: true, now: Date.now(), revalidatedItems });
} 