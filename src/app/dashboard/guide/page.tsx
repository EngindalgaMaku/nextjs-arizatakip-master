import fs from 'fs';
import path from 'path';

// Function to read the HTML file content server-side
async function getGuideHtml(): Promise<string> {
  // Construct the path relative to the project root where the build runs
  // Assuming the HTML file is in the root of the 'admin' directory
  const filePath = path.join(process.cwd(), 'ATSiS_Kullanim_Kilavuzu.html');
  try {
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    // Replace relative image paths (src="images/...) with absolute paths (src="/images/...)
    const correctedHtml = htmlContent.replace(/src="images\//g, 'src="/images/');
    return correctedHtml;
  } catch (error) {
    console.error("Error reading guide HTML file:", error);
    return '<p>Kullanım kılavuzu yüklenirken bir hata oluştu.</p>';
  }
}

export default async function GuidePage() {
  const guideHtml = await getGuideHtml();

  return (
    <div className="container mx-auto px-4 py-8"> {/* Added container and padding */}
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">
        ATSİS Kullanım Kılavuzu
      </h1>
      {/* 
        Render the HTML content. 
        Ensure the source HTML is trusted as this bypasses React's XSS protection.
        The CSS within the HTML file will be applied here. Be mindful of potential 
        style conflicts with your global application styles (e.g., Tailwind).
      */}
      <div
        className="prose prose-indigo max-w-none" // Using Tailwind typography plugin classes for basic styling, adjust as needed
        dangerouslySetInnerHTML={{ __html: guideHtml }}
      />
    </div>
  );
}

// Optional: Add metadata for the page
export const metadata = {
  title: 'Kullanım Kılavuzu - ATSİS',
  description: 'ATSİS Arıza Takip Sistemi Kullanım Kılavuzu',
}; 