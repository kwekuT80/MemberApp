'use client';

let scriptsLoadedPromise: Promise<void> | null = null;

/**
 * Loads html2pdf.js and JSZip dynamically from high-availability CDNs
 * ensuring zero server-side Chromium overhead on Vercel Hobbyist tier.
 */
export function loadPdfAndZipLibraries(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // If already loaded on window
  if ((window as any).html2pdf && (window as any).JSZip) {
    return Promise.resolve();
  }

  if (scriptsLoadedPromise) return scriptsLoadedPromise;

  scriptsLoadedPromise = new Promise((resolve, reject) => {
    const loadScript = (src: string) => {
      return new Promise<void>((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          res();
          return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => res();
        s.onerror = () => rej(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });
    };

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
    ])
      .then(() => resolve())
      .catch((err) => {
        scriptsLoadedPromise = null;
        reject(err);
      });
  });

  return scriptsLoadedPromise;
}

export interface PdfFileItem {
  filename: string;
  blob: Blob;
}

/**
 * Generates an A4 PDF Blob from a given HTML DOM element.
 */
export async function generatePdfBlob(element: HTMLElement, filename?: string): Promise<Blob> {
  await loadPdfAndZipLibraries();
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) {
    throw new Error('PDF generator library could not be loaded.');
  }

  const opt = {
    margin: [8, 8, 8, 8],
    filename: filename || 'statement.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  return html2pdf().set(opt).from(element).outputPdf('blob');
}

/**
 * Generates and triggers browser download for a single member's PDF.
 */
export async function downloadSinglePdf(element: HTMLElement, filename: string): Promise<void> {
  await loadPdfAndZipLibraries();
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) {
    throw new Error('PDF generator library could not be loaded.');
  }

  const opt = {
    margin: [8, 8, 8, 8],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  await html2pdf().set(opt).from(element).save();
}

/**
 * Bundles multiple generated PDF blobs into a single .ZIP archive and triggers download.
 */
export async function downloadZipArchive(
  files: PdfFileItem[],
  zipFilename: string
): Promise<void> {
  await loadPdfAndZipLibraries();
  const JSZip = (window as any).JSZip;
  if (!JSZip) {
    throw new Error('ZIP archiver library could not be loaded.');
  }

  const zip = new JSZip();
  files.forEach(({ filename, blob }) => {
    zip.file(filename, blob);
  });

  const zipBlob = await zip.generateAsync({ 
    type: 'blob', 
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
