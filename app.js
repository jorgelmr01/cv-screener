// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let apiKey = '';
let jobDescription = '';
let cvFiles = [];
let results = [];
let selectedModel = 'gpt-5.1';

// Load saved API key from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('cvScreenerApiKey');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
        apiKey = savedApiKey;
    }
    
    checkFormValidity();
});

// Save API key to localStorage
document.getElementById('apiKey').addEventListener('input', (e) => {
    apiKey = e.target.value;
    if (apiKey) {
        localStorage.setItem('cvScreenerApiKey', apiKey);
    }
    checkFormValidity();
});

document.getElementById('jobDescription').addEventListener('input', (e) => {
    jobDescription = e.target.value;
    checkFormValidity();
});

document.getElementById('cvFiles').addEventListener('change', (e) => {
    cvFiles = Array.from(e.target.files);
    checkFormValidity();
});

document.getElementById('gptModel').addEventListener('change', (e) => {
    selectedModel = e.target.value;
});

document.getElementById('analyzeBtn').addEventListener('click', analyzeCVs);
document.getElementById('sortBy').addEventListener('change', sortResults);

function checkFormValidity() {
    const btn = document.getElementById('analyzeBtn');
    btn.disabled = !(apiKey && jobDescription && cvFiles.length > 0);
}

async function analyzeCVs() {
    if (!apiKey || !jobDescription || cvFiles.length === 0) {
        showError('Please fill in all fields and select at least one CV file.');
        return;
    }

    // Hide previous results and errors
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('errorSection').classList.add('hidden');
    
    // Show loading
    const loadingSection = document.getElementById('loadingSection');
    const loadingText = document.getElementById('loadingText');
    loadingSection.classList.remove('hidden');
    
    results = [];
    
    try {
        for (let i = 0; i < cvFiles.length; i++) {
            const file = cvFiles[i];
            loadingText.textContent = `Processing ${i + 1}/${cvFiles.length}: ${file.name}...`;
            updateProgress((i / cvFiles.length) * 100);
            
            // Extract text from PDF
            const cvText = await extractTextFromPDF(file);
            
            // Extract contact information
            const contactInfo = extractContactInfo(cvText);
            
            // Analyze with ChatGPT
            const analysis = await analyzeCVWithGPT(cvText, file.name);
            
            results.push({
                fileName: file.name,
                cvText: cvText,
                ...contactInfo,
                ...analysis
            });
        }
        
        updateProgress(100);
        loadingText.textContent = 'Analysis complete!';
        
        // Display results
        setTimeout(() => {
            loadingSection.classList.add('hidden');
            displayResults();
        }, 500);
        
    } catch (error) {
        loadingSection.classList.add('hidden');
        showError(`Error during analysis: ${error.message}`);
        console.error('Analysis error:', error);
    }
}

async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = async function(e) {
            try {
                const typedArray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                
                let fullText = '';
                
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                resolve(fullText);
            } catch (error) {
                reject(new Error(`Failed to parse PDF: ${error.message}`));
            }
        };
        
        fileReader.onerror = () => reject(new Error('Failed to read file'));
        fileReader.readAsArrayBuffer(file);
    });
}

function extractContactInfo(cvText) {
    const contactInfo = {
        name: null,
        email: null,
        phone: null
    };
    
    // Extract email (common patterns)
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emailMatch = cvText.match(emailRegex);
    if (emailMatch && emailMatch.length > 0) {
        contactInfo.email = emailMatch[0];
    }
    
    // Extract phone (various formats)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const phoneMatches = cvText.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
        // Take the first phone number that looks valid (has enough digits)
        const validPhone = phoneMatches.find(p => p.replace(/\D/g, '').length >= 7);
        if (validPhone) {
            contactInfo.phone = validPhone.trim();
        }
    }
    
    // Extract name (usually at the beginning of the CV, first line or two)
    const lines = cvText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
        // Try to find name in first few lines
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i].trim();
            // Skip if it looks like an email or phone
            if (emailRegex.test(line) || phoneRegex.test(line)) continue;
            // Skip if it's too long (likely not a name)
            if (line.length > 50) continue;
            // Skip common headers
            if (line.toLowerCase().includes('curriculum') || 
                line.toLowerCase().includes('resume') ||
                line.toLowerCase().includes('linkedin')) continue;
            
            // If line has 2-4 words and looks like a name, use it
            const words = line.split(/\s+/).filter(w => w.length > 0);
            if (words.length >= 2 && words.length <= 4) {
                // Check if it contains mostly letters (not numbers or special chars)
                const isNameLike = words.every(word => /^[A-Za-zÀ-ÿ\s'-]+$/.test(word));
                if (isNameLike) {
                    contactInfo.name = line;
                    break;
                }
            }
        }
    }
    
    return contactInfo;
}

async function analyzeCVWithGPT(cvText, fileName) {
    const prompt = `You are an expert HR recruiter evaluating a LinkedIn-generated CV. Analyze the following CV and provide a detailed evaluation.

CV Content:
${cvText}

Job Position Context:
${jobDescription}

Evaluate the CV on the following 4 dimensions (each scored 0-10):

1. **Profile Relevance to Position** (0-10): Compare the CV content with the job position context. Consider skills, experience, and overall fit.

2. **Education Level** (0-10): Evaluate the prestige of educational institutions. Main degree counts for 80% of the value, additional certifications, exchange programs, etc. count for 20%.

3. **Previous Jobs** (0-10): Assess the prestige of previous employers and the level of the last position held.

4. **Proactivity** (0-10): Evaluate extracurricular activities, certifications, continuous learning, and initiative shown beyond basic job requirements.

Respond ONLY with a valid JSON object in this exact format (no markdown, no code blocks, just the JSON):
{
  "relevance": <number 0-10>,
  "education": <number 0-10>,
  "previousJobs": <number 0-10>,
  "proactivity": <number 0-10>,
  "analysis": {
    "relevance": "<brief explanation>",
    "education": "<brief explanation>",
    "previousJobs": "<brief explanation>",
    "proactivity": "<brief explanation>"
  }
}`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert HR recruiter. Always respond with valid JSON only, no markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        // Remove markdown code blocks if present
        let jsonText = content;
        if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        const analysis = JSON.parse(jsonText);
        
        // Validate scores are in range
        ['relevance', 'education', 'previousJobs', 'proactivity'].forEach(key => {
            if (analysis[key] < 0 || analysis[key] > 10) {
                throw new Error(`Invalid score for ${key}: ${analysis[key]}`);
            }
        });
        
        return analysis;
    } catch (error) {
        if (error.message.includes('JSON')) {
            throw new Error(`Failed to parse AI response for ${fileName}. The AI may have returned invalid JSON.`);
        }
        throw error;
    }
}

function displayResults() {
    const resultsSection = document.getElementById('resultsSection');
    const gallery = document.getElementById('resultsGallery');
    
    // Calculate total scores
    results.forEach(result => {
        result.totalScore = result.relevance + result.education + result.previousJobs + result.proactivity;
    });
    
    // Sort by total score (default)
    sortResults();
    
    resultsSection.classList.remove('hidden');
}

function sortResults() {
    const sortBy = document.getElementById('sortBy').value;
    
    results.sort((a, b) => {
        if (sortBy === 'total') {
            return b.totalScore - a.totalScore;
        } else if (sortBy === 'relevance') {
            return b.relevance - a.relevance;
        } else if (sortBy === 'education') {
            return b.education - a.education;
        } else if (sortBy === 'jobs') {
            return b.previousJobs - a.previousJobs;
        } else if (sortBy === 'proactivity') {
            return b.proactivity - a.proactivity;
        }
        return 0;
    });
    
    renderGallery();
}

function renderGallery() {
    const gallery = document.getElementById('resultsGallery');
    gallery.innerHTML = '';
    
    results.forEach((result, index) => {
        const card = createCVCard(result, index + 1);
        gallery.appendChild(card);
    });
}

function createCVCard(result, rank) {
    const card = document.createElement('div');
    card.className = `cv-card ${rank <= 3 ? `rank-${rank}` : ''}`;
    card.style.cursor = 'pointer';
    
    // Add click handler to show CV preview
    card.addEventListener('click', (e) => {
        // Trigger preview unless clicking on interactive elements (future-proofing)
        if (!e.target.closest('button, a, input')) {
            showCVPreview(result);
        }
    });
    
    const contactInfo = `
        <div class="contact-info">
            <div class="candidate-name">${result.name || 'Name not found'}</div>
            ${result.email ? `<div class="contact-item"><span class="contact-icon">📧</span> <a href="mailto:${result.email}" onclick="event.stopPropagation()">${result.email}</a></div>` : ''}
            ${result.phone ? `<div class="contact-item"><span class="contact-icon">📞</span> <a href="tel:${result.phone.replace(/\s/g, '')}" onclick="event.stopPropagation()">${result.phone}</a></div>` : ''}
        </div>
    `;
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-title">${result.fileName}</div>
            <div class="rank-badge">#${rank}</div>
        </div>
        
        ${contactInfo}
        
        <div class="total-score">${result.totalScore.toFixed(1)}/40</div>
        
        <div class="score-breakdown">
            <div class="score-item">
                <div class="score-item-label">Profile Relevance</div>
                <div class="score-item-value">${result.relevance.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.relevance / 10) * 100}%"></div>
                </div>
            </div>
            
            <div class="score-item">
                <div class="score-item-label">Education Level</div>
                <div class="score-item-value">${result.education.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.education / 10) * 100}%"></div>
                </div>
            </div>
            
            <div class="score-item">
                <div class="score-item-label">Previous Jobs</div>
                <div class="score-item-value">${result.previousJobs.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.previousJobs / 10) * 100}%"></div>
                </div>
            </div>
            
            <div class="score-item">
                <div class="score-item-label">Proactivity</div>
                <div class="score-item-value">${result.proactivity.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.proactivity / 10) * 100}%"></div>
                </div>
            </div>
        </div>
        
        <div class="analysis-text">
            <h4>Analysis:</h4>
            <p><strong>Relevance:</strong> ${result.analysis.relevance}</p>
            <p><strong>Education:</strong> ${result.analysis.education}</p>
            <p><strong>Previous Jobs:</strong> ${result.analysis.previousJobs}</p>
            <p><strong>Proactivity:</strong> ${result.analysis.proactivity}</p>
        </div>
        
        <div class="preview-hint">Click to preview full CV</div>
    `;
    
    return card;
}

function showCVPreview(result) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'cv-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>CV Preview: ${result.fileName}</h2>
                <button class="modal-close" onclick="this.closest('.cv-modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="cv-preview-text">${formatCVText(result.cvText)}</div>
            </div>
        </div>
    `;
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on Escape key
    const closeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeHandler);
        }
    };
    document.addEventListener('keydown', closeHandler);
    
    document.body.appendChild(modal);
}

function formatCVText(text) {
    // Format the text with line breaks preserved
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => `<p>${escapeHtml(line)}</p>`)
        .join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateProgress(percent) {
    document.getElementById('progressFill').style.width = percent + '%';
}

function showError(message) {
    const errorSection = document.getElementById('errorSection');
    errorSection.textContent = `Error: ${message}`;
    errorSection.classList.remove('hidden');
}

