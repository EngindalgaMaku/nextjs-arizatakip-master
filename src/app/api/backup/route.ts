import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import stream from 'stream';
import { promisify } from 'util';
import { checkAdminRole } from '../../../utils/auth'; // Assuming an auth check utility exists

const pipeline = promisify(stream.pipeline);

export async function GET(req: NextRequest) {
  // --- Authentication Check ---
  // This assumes you have a way to verify the user is an admin.
  // Replace with your actual authentication/authorization logic.
  const isAdmin = await checkAdminRole(); 
  if (!isAdmin) {
    return new NextResponse('Unauthorized', { status: 403 });
  }
  // --- End Authentication Check ---

  const dbUrl = process.env.SUPABASE_DB_URL; // Ensure this is set in your .env.local

  if (!dbUrl) {
    console.error('SUPABASE_DB_URL environment variable is not set.');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  // Construct the pg_dump command
  // Exclude common Supabase internal schemas
  const pgDumpArgs = [
    '--dbname=' + dbUrl,
    '--no-password', // Assuming password is in the URL or handled by environment
    '--clean',
    '--if-exists',
    '--exclude-schema=extensions',
    '--exclude-schema=graphql',
    '--exclude-schema=graphql_public',
    '--exclude-schema=net',
    '--exclude-schema=pgroonga',
    '--exclude-schema=pgsodium',
    '--exclude-schema=pgsodium_masks',
    '--exclude-schema=realtime',
    '--exclude-schema=storage',
    '--exclude-schema=supabase_functions',
    '--exclude-schema=supabase_migrations',
    '--exclude-schema=vault',
    '--exclude-schema=auth', // Also exclude auth schema
    '--exclude-schema=pgbouncer', // Exclude pgbouncer schema
  ];

  try {
    // Spawn the pg_dump process
    // Ensure pg_dump is installed and accessible in your server environment's PATH
    const pgDumpProcess = spawn('pg_dump', pgDumpArgs);

    // Create a passthrough stream to pipe the output
    const passThrough = new stream.PassThrough();

    // Pipe pg_dump stdout to the passthrough stream
    pipeline(pgDumpProcess.stdout, passThrough).catch((err) => {
      console.error('Pipeline failed:', err);
      // Handle pipeline errors if necessary, though errors below might catch it first
    });

    // Log any errors from pg_dump stderr
    pgDumpProcess.stderr.on('data', (data) => {
      console.error(`pg_dump stderr: ${data}`);
    });

    // Handle errors during process spawning or execution
    pgDumpProcess.on('error', (error) => {
      console.error('Failed to start pg_dump process:', error);
      // Don't try to write to response here as headers might already be sent
    });

    // Create response headers for file download
    const headers = new Headers();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    headers.set('Content-Disposition', `attachment; filename="backup-${timestamp}.sql"`);
    headers.set('Content-Type', 'application/sql');

    // Return the stream directly as the response body
    // Note: Type casting might be needed depending on Next.js version/types
    return new NextResponse(passThrough as any, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error('Error creating database backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Optional: Add basic OPTIONS handler for CORS if needed, though likely not for a direct download link
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
} 