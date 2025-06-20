// Ensure dynamic export is present for client-side hooks
export const dynamic = 'force-dynamic';

import LocationsClient from './LocationsClient';

export default function LocationsPage() {
  return <LocationsClient />;
} 