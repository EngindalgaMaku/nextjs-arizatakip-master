import React from 'react';

// Basic layout component for the device print page
// It ensures the page content is rendered without the default admin layout (sidebar, header)
export default function DevicePrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>; // Render only the children, effectively isolating the page content
} 