# CV Screener - LinkedIn CV Evaluator

An AI-powered web application that evaluates LinkedIn-generated CVs using ChatGPT API. The tool analyzes CVs across multiple dimensions and provides a ranked gallery view of candidates.

## Features

- **Multi-CV Upload**: Upload and analyze multiple LinkedIn CV PDFs simultaneously
- **AI-Powered Analysis**: Uses ChatGPT API to evaluate CVs on 4 key dimensions:
  1. **Profile Relevance** (0-10): Compares CV content with job position requirements
  2. **Education Level** (0-10): Evaluates prestige of institutions (80% main degree, 20% additional certifications)
  3. **Previous Jobs** (0-10): Assesses prestige of employers and position levels
  4. **Proactivity** (0-10): Evaluates extracurriculars, certifications, and continuous learning
- **Ranked Gallery View**: Automatically ranks candidates by total score with visual indicators
- **Detailed Analysis**: Provides explanations for each dimension
- **Sortable Results**: Sort by any dimension or total score
- **Modern UI**: Clean, responsive design with progress tracking

## How to Use

1. **Open the Application**: Open `index.html` in a modern web browser (Chrome, Firefox, Edge)

2. **Enter Your API Key**: 
   - Get your OpenAI API key from https://platform.openai.com/api-keys
   - Enter it in the "OpenAI API Key" field (saved locally in your browser)

3. **Enter Job Description**: 
   - Paste the job position description, requirements, and context
   - This helps the AI evaluate profile relevance

4. **Upload CVs**: 
   - Click "Upload LinkedIn CVs" and select one or more PDF files
   - The app supports multiple files at once

5. **Analyze**: 
   - Click "Analyze CVs" button
   - Wait for processing (progress bar shows status)
   - Results appear in a ranked gallery

6. **Review Results**: 
   - View scores for each dimension
   - Read detailed analysis explanations
   - Sort by different criteria using the dropdown
   - Top 3 candidates are highlighted with special styling

## Technical Details

- **PDF Parsing**: Uses PDF.js library to extract text from LinkedIn CV PDFs
- **AI Model**: Uses GPT-4o-mini for cost-effective analysis
- **Storage**: API key is stored in browser localStorage (never sent to external servers)
- **No Backend Required**: Runs entirely in the browser

## File Structure

```
CV Screener/
├── index.html      # Main HTML structure
├── styles.css      # Styling and layout
├── app.js          # Application logic and API integration
└── README.md       # This file
```

## Requirements

- Modern web browser with JavaScript enabled
- OpenAI API key with credits
- LinkedIn CV files in PDF format

## Notes

- The app processes CVs sequentially to avoid API rate limits
- Each CV analysis uses approximately 1000 tokens
- Results are displayed immediately after all CVs are processed
- The API key is stored locally and never shared

## Troubleshooting

- **PDF parsing errors**: Ensure PDFs are not corrupted and are readable
- **API errors**: Check your API key is valid and has sufficient credits
- **No results**: Verify all fields are filled and files are selected
- **Slow processing**: Large CVs or many files may take time; be patient

