// This must be a SERVER component
export const dynamic = 'force-dynamic';

import DallarClient from './DallarClient';

export default function DallarPage() {
  return <DallarClient />;
} 