import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs';

const summaryForm = document.getElementById('summary-form');
const pdfForm = document.getElementById('pdf-form');
const output = document.getElementById('output');

async function callSummarize(payload) {
  const res = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Summary request failed');
  }
  return data;
}

summaryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  output.textContent = 'Generating summary...';

  try {
    const payload = {
      sourceType: document.getElementById('sourceType').value,
      sourceLink: document.getElementById('sourceLink').value,
      inputText: document.getElementById('inputText').value
    };

    const data = await callSummarize(payload);
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

async function extractPdfText(file) {
  const bytes = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const chunks = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    chunks.push(pageText);
  }

  return chunks.join('\n').replace(/\s+/g, ' ').trim();
}

pdfForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fileInput = document.getElementById('pdfFile');

  if (!fileInput.files.length) {
    output.textContent = 'Please select a PDF first.';
    return;
  }

  output.textContent = 'Extracting text from PDF...';

  try {
    const file = fileInput.files[0];
    const extractedText = await extractPdfText(file);

    if (!extractedText) {
      output.textContent = 'No readable text found in this PDF (might be scanned image-only PDF).';
      return;
    }

    output.textContent = 'Sending extracted text to AI summarizer...';

    const data = await callSummarize({
      sourceType: 'pdf_upload',
      sourceLink: file.name,
      extractedText
    });

    output.textContent = JSON.stringify({
      fileName: file.name,
      extractedCharacters: extractedText.length,
      ...data
    }, null, 2);
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});
