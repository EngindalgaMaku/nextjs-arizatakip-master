// This must be a SERVER component
export const dynamic = 'force-dynamic';

import SemestersClient from './SemestersClient';

export default function SemestersPage() {
  return <SemestersClient />;
} 