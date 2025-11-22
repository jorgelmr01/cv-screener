import * as pdfjsLib from 'pdfjs-dist';

// Import worker as raw string to bundle it
import workerCode from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';

// Create a Blob from the worker code
const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);

// Set worker source to the Blob URL
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PDFData {
    text: string;
    numPages: number;
}

export async function extractTextFromPDF(file: File): Promise<PDFData> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return {
        text: fullText,
        numPages: pdf.numPages
    };
}

export function extractContactInfo(text: string) {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;

    const emailMatch = text.match(emailRegex);
    const phoneMatches = text.match(phoneRegex);

    // Simple name extraction heuristic (first line or looking for "Name" patterns is hard without layout)
    // We'll leave name null for now or take the first non-empty line if needed, 
    // but user can edit it.

    return {
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatches ? phoneMatches.find(p => p.length > 8) || null : null,
        name: null // Placeholder
    };
}
