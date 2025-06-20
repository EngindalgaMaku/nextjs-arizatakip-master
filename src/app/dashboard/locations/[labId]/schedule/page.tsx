'use client';

import { useParams } from 'next/navigation';
import LocationScheduleClientPage from './LocationScheduleClientPage';

export default function Page() {
  const params = useParams();
  const labId = params.labId as string;
  
  return <LocationScheduleClientPage labId={labId} />;
} 