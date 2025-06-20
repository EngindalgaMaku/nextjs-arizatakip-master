import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
        return NextResponse.json(
            { error: 'Teacher ID is required' },
            { status: 400 }
        );
    }

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    async get(name: string) {
                        const cookieStore = await cookies();
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );
        
        // Fetch a single row to determine column names - this part can be simplified if we assume/know the column names
        // For now, we keep it to understand the logic, but for production, it's better to have fixed knowledge of DB schema.
        const { data: columnInfo, error: columnError } = await supabase
            .from('teacher_unavailability')
            .select('day, day_of_week') // Select only relevant columns to check existence
            .limit(1);

        if (columnError && columnError.code !== 'PGRST116') { // PGRST116: 0 rows returned (empty table)
            // If there's a real error other than empty table, throw it
            // console.error("Error checking columns:", columnError);
            // throw columnError; 
            // For now, let's proceed assuming one of them might exist or let the main query fail if neither does.
        }

        // Determine the actual day column name in the DB if it could be either 'day' or 'day_of_week'
        // This logic is a bit complex for a route handler. Ideally, DB schema should be consistent.
        let dbDayColumnName = 'day_of_week'; // Default to what our Zod schema expects
        if (columnInfo && columnInfo.length > 0) {
            if ('day_of_week' in columnInfo[0] && columnInfo[0].day_of_week !== null) {
                dbDayColumnName = 'day_of_week';
            } else if ('day' in columnInfo[0] && columnInfo[0].day !== null) {
                dbDayColumnName = 'day';
            }
        }

        const { data, error } = await supabase
            .from('teacher_unavailability')
            .select('*') // Select all columns initially
            .eq('teacher_id', teacherId)
            .order(dbDayColumnName, { ascending: true }); // Order by the actual column name in DB

        if (error) {
            throw error;
        }

        // Map the data to ensure 'day_of_week' field is present as expected by the client-side type
        const processedData = (data || []).map(item => {
            const newItem = { ...item };
            if (dbDayColumnName === 'day' && newItem.day !== undefined) {
                newItem.day_of_week = newItem.day; // Copy 'day' to 'day_of_week'
                delete newItem.day; // Optional: remove the original 'day' field if it shouldn't exist alongside day_of_week
            }
            // If dbDayColumnName is already 'day_of_week', no change needed for this field.
            return newItem;
        });

        return NextResponse.json(processedData);
    } catch (error) {
        console.error('Error fetching teacher unavailability:', error);
        return NextResponse.json(
            { error: 'Failed to fetch teacher unavailability' },
            { status: 500 }
        );
    }
} 