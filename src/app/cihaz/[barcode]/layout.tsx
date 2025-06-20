import React from 'react';

// Basic layout component for the device public page
// It ensures the page content is rendered without the default admin layout (sidebar, header)
export default function DevicePublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>; // Render only the children, effectively isolating the page content
} 