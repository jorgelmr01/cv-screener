// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let apiKey = '';
let jobDescription = '';
let personalizedInstructions = '';
let cvFiles = [];
let results = [];
let selectedModel = 'gpt-5.1';
let selectedCVs = new Set();
const MAX_SELECTED = 10;
let evaluationCriteria = {
    relevance: { name: 'Profile Relevance to Position', desc: 'Compare the CV content with the job position context. Consider skills, experience, and overall fit.' },
    education: { name: 'Education Level', desc: 'Evaluate the prestige of educational institutions. Main degree counts for 80% of the value, additional certifications, exchange programs, etc. count for 20%.' },
    previousJobs: { name: 'Previous Jobs', desc: 'Assess the prestige of previous employers and the level of the last position held.' },
    proactivity: { name: 'Proactivity', desc: 'Evaluate extracurricular activities, certifications, continuous learning, and initiative shown beyond basic job requirements.' }
};
let chatHistory = [];
let chatCVSelection = new Set();

// Load saved API key and criteria from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('cvScreenerApiKey');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
        apiKey = savedApiKey;
    }
    
    // Load saved criteria
    const savedCriteria = localStorage.getItem('cvScreenerCriteria');
    if (savedCriteria) {
        try {
            evaluationCriteria = JSON.parse(savedCriteria);
            updateCriteriaUI();
        } catch (e) {
            console.error('Failed to load criteria:', e);
        }
    }
    
    // Initialize chat
    initializeChat();
    
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

document.getElementById('personalizedInstructions').addEventListener('input', (e) => {
    personalizedInstructions = e.target.value;
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
document.getElementById('searchCVs').addEventListener('input', filterCVs);
document.getElementById('clearSelection').addEventListener('click', clearSelection);

// Criteria configuration
document.querySelectorAll('.criterion-name, .criterion-desc').forEach(input => {
    input.addEventListener('input', saveCriteria);
});

// Initialize criteria config as collapsed
window.toggleCriteriaConfig = function() {
    const config = document.getElementById('criteriaConfig');
    const icon = document.getElementById('criteriaToggleIcon');
    config.classList.toggle('collapsed');
    icon.textContent = config.classList.contains('collapsed') ? '▶' : '▼';
};

// Initialize criteria as collapsed
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const config = document.getElementById('criteriaConfig');
        if (config) {
            config.classList.add('collapsed');
            document.getElementById('criteriaToggleIcon').textContent = '▶';
        }
    }, 100);
});

// Interview questions
document.getElementById('generateQuestionsBtn').addEventListener('click', generateInterviewQuestions);
document.getElementById('closeInterviewSection').addEventListener('click', () => {
    document.getElementById('interviewQuestionsSection').classList.add('hidden');
});

// Chat interface
document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});
document.getElementById('toggleChat').addEventListener('click', toggleChat);
document.getElementById('openChatBtn').addEventListener('click', () => {
    document.getElementById('chatSection').classList.remove('hidden');
    document.getElementById('openChatBtn').classList.add('hidden');
});

// Chat dropdown
window.toggleChatDropdown = function() {
    const dropdown = document.getElementById('chatDropdown');
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
        document.getElementById('chatCVSearch').focus();
    }
};

document.getElementById('chatCVSearch').addEventListener('input', filterChatCVs);
document.getElementById('chatCVSearch').addEventListener('click', (e) => e.stopPropagation());

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('chatDropdown');
    const container = document.querySelector('.chat-dropdown-container');
    if (dropdown && container && !container.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

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
        // Process all CVs sequentially to avoid overwhelming the browser
        for (let i = 0; i < cvFiles.length; i++) {
            const file = cvFiles[i];
            loadingText.textContent = `Processing ${i + 1}/${cvFiles.length}: ${file.name}...`;
            updateProgress((i / cvFiles.length) * 100);
            
            try {
                // Extract text from PDF
                const pdfData = await extractTextFromPDF(file);
                const cvText = pdfData.text;
                const textPositions = pdfData.positions;
                
                // Extract contact information with position data
                const contactInfo = extractContactInfo(cvText, textPositions);
                
                // Store file data for PDF preview (convert to base64 for reliable access)
                const fileReader = new FileReader();
                const pdfDataUrl = await new Promise((resolve, reject) => {
                    fileReader.onload = (e) => resolve(e.target.result);
                    fileReader.onerror = reject;
                    fileReader.readAsDataURL(file);
                });
                
                // Also keep object URL as backup
                const pdfUrl = URL.createObjectURL(file);
                
                // Analyze with ChatGPT
                const analysis = await analyzeCVWithGPT(cvText, file.name);
                
                results.push({
                    fileName: file.name,
                    cvText: cvText,
                    pdfUrl: pdfUrl,
                    pdfDataUrl: pdfDataUrl, // Base64 data URL for more reliable preview
                    pdfFile: file, // Keep file reference for download
                    ...contactInfo,
                    ...analysis
                });
            } catch (fileError) {
                console.error(`Error processing ${file.name}:`, fileError);
                // Continue with next file even if one fails
                loadingText.textContent = `Error processing ${file.name}, continuing...`;
            }
            
            // Allow browser to breathe between files
            if (i % 5 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        updateProgress(100);
        loadingText.textContent = 'Analysis complete!';
        
        // Calculate total scores for all results
        results.forEach(result => {
            result.totalScore = result.relevance + result.education + result.previousJobs + result.proactivity;
        });
        
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
                let textWithPositions = [];
                
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const viewport = page.getViewport({ scale: 1.0 });
                    
                    // Store text with positions for name extraction
                    const pageItems = textContent.items.map(item => {
                        const tx = item.transform[4];
                        const ty = item.transform[5];
                        return {
                            text: item.str,
                            x: tx,
                            y: ty,
                            width: viewport.width
                        };
                    });
                    
                    textWithPositions.push(...pageItems);
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                // Store positions for name extraction
                resolve({ text: fullText, positions: textWithPositions });
            } catch (error) {
                reject(new Error(`Failed to parse PDF: ${error.message}`));
            }
        };
        
        fileReader.onerror = () => reject(new Error('Failed to read file'));
        fileReader.readAsArrayBuffer(file);
    });
}

function extractContactInfo(cvText, textPositions = null) {
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
    
    // Extract name - improved logic for LinkedIn CVs
    // First try using position data to find text on the right side (top of page)
    if (textPositions && textPositions.length > 0) {
        // Get page width (use first item's width as reference)
        const pageWidth = textPositions[0]?.width || 612;
        const rightSideThreshold = pageWidth * 0.4; // Right 60% of page (for LinkedIn CVs)
        
        // Find max Y value (top of page in PDF coordinates)
        const maxY = Math.max(...textPositions.map(item => item.y));
        const topThreshold = maxY * 0.15; // Top 15% of page
        
        // Find text items on the right side, near the top
        const topRightItems = textPositions
            .filter(item => item.x >= rightSideThreshold && item.y >= topThreshold)
            .sort((a, b) => {
                // Sort by Y position (top to bottom), then by X (right to left)
                if (Math.abs(b.y - a.y) > 10) {
                    return b.y - a.y; // Different Y positions
                }
                return b.x - a.x; // Same Y, prefer rightmost
            })
            .slice(0, 20); // Top 20 items on right side
        
        // Try to combine consecutive items on the same line to form full names
        const nameCandidates = [];
        for (let i = 0; i < topRightItems.length; i++) {
            const item = topRightItems[i];
            const text = item.text.trim();
            
            // Check if this item looks like part of a name
            if (text.length > 0 && text.length < 30 && /^[A-Za-zÀ-ÿ\s'-]+$/.test(text)) {
                // Try to find adjacent items on the same line (similar Y position)
                const sameLineItems = topRightItems.filter(other => 
                    Math.abs(other.y - item.y) < 5 && 
                    Math.abs(other.x - item.x) < 200
                ).sort((a, b) => a.x - b.x);
                
                if (sameLineItems.length > 0) {
                    const combinedName = sameLineItems.map(i => i.text.trim()).join(' ').trim();
                    if (combinedName.length > 0 && combinedName.length < 50) {
                        const words = combinedName.split(/\s+/).filter(w => w.length > 0);
                        if (words.length >= 2 && words.length <= 4) {
                            if (!emailRegex.test(combinedName) && !phoneRegex.test(combinedName)) {
                                nameCandidates.push(combinedName);
                            }
                        }
                    }
                }
            }
        }
        
        // Use the first valid name candidate
        if (nameCandidates.length > 0) {
            contactInfo.name = nameCandidates[0];
        }
    }
    
    // Fallback: Extract name from text lines (if position-based extraction didn't work)
    if (!contactInfo.name) {
        const lines = cvText.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
            // Try first few lines
            for (let i = 0; i < Math.min(10, lines.length); i++) {
                const line = lines[i].trim();
                // Skip if it looks like an email or phone
                if (emailRegex.test(line) || phoneRegex.test(line)) continue;
                // Skip if it's too long (likely not a name)
                if (line.length > 50) continue;
                // Skip common headers
                if (line.toLowerCase().includes('curriculum') || 
                    line.toLowerCase().includes('resume') ||
                    line.toLowerCase().includes('linkedin') ||
                    line.toLowerCase().includes('profile') ||
                    line.toLowerCase().includes('contact')) continue;
                
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
    }
    
    return contactInfo;
}

function saveCriteria() {
    const criteria = {};
    document.querySelectorAll('.criterion-item').forEach(item => {
        const criterionKey = item.querySelector('.criterion-name').dataset.criterion;
        const name = item.querySelector('.criterion-name').value;
        const desc = item.querySelector('.criterion-desc').value;
        criteria[criterionKey] = { name, desc };
    });
    evaluationCriteria = criteria;
    localStorage.setItem('cvScreenerCriteria', JSON.stringify(criteria));
}

function updateCriteriaUI() {
    Object.keys(evaluationCriteria).forEach(key => {
        const nameInput = document.querySelector(`.criterion-name[data-criterion="${key}"]`);
        const descInput = document.querySelector(`.criterion-desc[data-criterion="${key}"]`);
        if (nameInput) nameInput.value = evaluationCriteria[key].name;
        if (descInput) descInput.value = evaluationCriteria[key].desc;
    });
}

async function analyzeCVWithGPT(cvText, fileName) {
    let instructionsSection = '';
    if (personalizedInstructions && personalizedInstructions.trim()) {
        instructionsSection = `

Additional Personalized Instructions:
${personalizedInstructions}

IMPORTANT: Apply these personalized instructions when evaluating the CV. Adjust scores accordingly if the instructions specify exclusions (e.g., exclude candidates from certain schools/companies) or prioritizations.`;
    }
    
    // Build criteria section from custom criteria
    const criteriaSection = Object.entries(evaluationCriteria).map(([key, crit], index) => {
        return `${index + 1}. **${crit.name}** (0-10): ${crit.desc}`;
    }).join('\n\n');
    
    const prompt = `You are an expert HR recruiter evaluating a LinkedIn-generated CV. Analyze the following CV and provide a detailed evaluation.

CV Content:
${cvText}

Job Position Context:
${jobDescription}${instructionsSection}

Evaluate the CV on the following 4 dimensions (each scored 0-10):

${criteriaSection}

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
    resultsSection.classList.remove('hidden');
    
    // Show chat button (chat section starts hidden)
    document.getElementById('openChatBtn').classList.remove('hidden');
    document.body.classList.add('chat-hidden');
    updateChatCVSelector();
    
    // Sort by total score (default)
    sortResults();
    
    // Render sidebar list
    renderSidebar();
    
    // Clear selection
    selectedCVs.clear();
    updateSelectionUI();
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
    
    renderSidebar();
    renderSelectedGallery();
}

function renderSidebar() {
    const sidebarList = document.getElementById('sidebarList');
    sidebarList.innerHTML = '';
    
    const searchTerm = document.getElementById('searchCVs').value.toLowerCase();
    const filteredResults = results.filter(result => {
        const name = (result.name || '').toLowerCase();
        const fileName = result.fileName.toLowerCase();
        return name.includes(searchTerm) || fileName.includes(searchTerm);
    });
    
    filteredResults.forEach((result, index) => {
        const listItem = createSidebarItem(result, index + 1);
        sidebarList.appendChild(listItem);
    });
}

function createSidebarItem(result, rank) {
    const item = document.createElement('div');
    item.className = `sidebar-item ${selectedCVs.has(result.fileName) ? 'selected' : ''}`;
    item.dataset.fileName = result.fileName;
    
    const shortName = result.name || result.fileName.replace('.pdf', '');
    const displayName = shortName.length > 30 ? shortName.substring(0, 30) + '...' : shortName;
    
    item.innerHTML = `
        <div class="sidebar-item-checkbox">
            <input type="checkbox" ${selectedCVs.has(result.fileName) ? 'checked' : ''} 
                   ${selectedCVs.size >= MAX_SELECTED && !selectedCVs.has(result.fileName) ? 'disabled' : ''} />
        </div>
        <div class="sidebar-item-content">
            <div class="sidebar-item-name">${escapeHtml(displayName)}</div>
            <div class="sidebar-item-score">${result.totalScore.toFixed(1)}/40</div>
        </div>
        <div class="sidebar-item-rank">#${rank}</div>
    `;
    
    // Add click handler
    item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (!checkbox.disabled) {
                checkbox.checked = !checkbox.checked;
                toggleSelection(result.fileName, checkbox.checked);
            }
        }
    });
    
    // Checkbox handler
    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleSelection(result.fileName, checkbox.checked);
    });
    
    return item;
}

function toggleSelection(fileName, isSelected) {
    if (isSelected) {
        if (selectedCVs.size < MAX_SELECTED) {
            selectedCVs.add(fileName);
        } else {
            return; // Can't select more
        }
    } else {
        selectedCVs.delete(fileName);
    }
    
    updateSelectionUI();
    renderSidebar();
    renderSelectedGallery();
}

function clearSelection() {
    selectedCVs.clear();
    updateSelectionUI();
    renderSidebar();
    renderSelectedGallery();
}

function updateSelectionUI() {
    const count = selectedCVs.size;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('selectedBadge').textContent = `${count} selected`;
    
    // Update sidebar items
    document.querySelectorAll('.sidebar-item').forEach(item => {
        const fileName = item.dataset.fileName;
        if (selectedCVs.has(fileName)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
        
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = selectedCVs.has(fileName);
            checkbox.disabled = count >= MAX_SELECTED && !selectedCVs.has(fileName);
        }
    });
}

function renderSelectedGallery() {
    const gallery = document.getElementById('selectedGallery');
    
    if (selectedCVs.size === 0) {
        gallery.innerHTML = `
            <div class="empty-state">
                <p>Select CVs from the sidebar to view detailed analysis</p>
                <small>You can select up to 10 CVs at a time</small>
            </div>
        `;
        // Hide interview questions section
        document.getElementById('interviewQuestionsSection').classList.add('hidden');
        return;
    }
    
    gallery.innerHTML = '';
    
    const selectedResults = results.filter(r => selectedCVs.has(r.fileName));
    // Get ranks based on sorted results array
    const sortedSelected = [...selectedResults].map(result => {
        const rank = results.findIndex(r => r.fileName === result.fileName) + 1;
        return { result, rank };
    }).sort((a, b) => b.result.totalScore - a.result.totalScore);
    
    sortedSelected.forEach(({ result, rank }) => {
        const card = createCVCard(result, rank);
        gallery.appendChild(card);
    });
    
    // Show interview questions section (separate from gallery)
    document.getElementById('interviewQuestionsSection').classList.remove('hidden');
}

function filterCVs() {
    renderSidebar();
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
                <div class="score-item-label">${escapeHtml(evaluationCriteria.relevance.name)}</div>
                <div class="score-item-value">${result.relevance.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.relevance / 10) * 100}%"></div>
                </div>
            </div>
            
            <div class="score-item">
                <div class="score-item-label">${escapeHtml(evaluationCriteria.education.name)}</div>
                <div class="score-item-value">${result.education.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.education / 10) * 100}%"></div>
                </div>
            </div>
            
            <div class="score-item">
                <div class="score-item-label">${escapeHtml(evaluationCriteria.previousJobs.name)}</div>
                <div class="score-item-value">${result.previousJobs.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.previousJobs / 10) * 100}%"></div>
                </div>
            </div>
            
            <div class="score-item">
                <div class="score-item-label">${escapeHtml(evaluationCriteria.proactivity.name)}</div>
                <div class="score-item-value">${result.proactivity.toFixed(1)}/10</div>
                <div class="score-item-bar">
                    <div class="score-item-fill" style="width: ${(result.proactivity / 10) * 100}%"></div>
                </div>
            </div>
        </div>
        
        <div class="analysis-text">
            <h4>Analysis:</h4>
            <p><strong>${escapeHtml(evaluationCriteria.relevance.name)}:</strong> ${escapeHtml(result.analysis.relevance)}</p>
            <p><strong>${escapeHtml(evaluationCriteria.education.name)}:</strong> ${escapeHtml(result.analysis.education)}</p>
            <p><strong>${escapeHtml(evaluationCriteria.previousJobs.name)}:</strong> ${escapeHtml(result.analysis.previousJobs)}</p>
            <p><strong>${escapeHtml(evaluationCriteria.proactivity.name)}:</strong> ${escapeHtml(result.analysis.proactivity)}</p>
        </div>
        
        <div class="preview-hint">Click to preview full CV</div>
    `;
    
    return card;
}

async function showCVPreview(result) {
    if (!result.pdfUrl && !result.pdfDataUrl && !result.pdfFile) {
        showError('PDF preview not available. The file may have been removed.');
        return;
    }
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'cv-modal';
    
    const cleanup = () => {
        // Don't revoke URL as we might need it for download
    };
    
    // Get PDF URL - prefer data URL, fallback to object URL
    const pdfUrl = result.pdfDataUrl || result.pdfUrl;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>CV Preview: ${escapeHtml(result.fileName)}</h2>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="pdf-container">
                    <div id="pdfViewer" class="pdf-viewer-canvas">
                        <div class="pdf-loading">Loading PDF...</div>
                    </div>
                    <iframe 
                        src="${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1" 
                        class="pdf-preview-iframe" 
                        type="application/pdf"
                        title="PDF Preview"
                        style="display: none;">
                    </iframe>
                </div>
                <div class="pdf-fallback">
                    <button class="btn-download-pdf">📥 Download PDF</button>
                    <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer" class="pdf-link" id="pdfOpenLink">🔗 Open in new tab</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Render PDF using PDF.js
    try {
        await renderPDFWithPDFJS(result, modal);
    } catch (error) {
        console.error('PDF.js rendering failed, falling back to iframe:', error);
        // Fallback to iframe
        const iframe = modal.querySelector('.pdf-preview-iframe');
        const viewer = modal.querySelector('#pdfViewer');
        if (iframe && viewer) {
            viewer.style.display = 'none';
            iframe.style.display = 'block';
        }
    }
    
    // Close button handler
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        cleanup();
        modal.remove();
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cleanup();
            modal.remove();
        }
    });
    
    // Close on Escape key
    const closeHandler = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            modal.remove();
            document.removeEventListener('keydown', closeHandler);
        }
    };
    document.addEventListener('keydown', closeHandler);
    
    // Make sure PDF link works
    const pdfLink = modal.querySelector('#pdfOpenLink');
    if (pdfLink) {
        pdfLink.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Try multiple methods to ensure it opens
            const url = result.pdfDataUrl || result.pdfUrl;
            if (url) {
                // Method 1: Direct window.open
                const newWindow = window.open('', '_blank', 'noopener,noreferrer');
                if (newWindow) {
                    newWindow.location.href = url;
                } else {
                    // Method 2: Create link and click
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        });
        
        // Also set href directly
        pdfLink.href = pdfUrl;
    }
    
    // Download button handler
    const downloadBtn = modal.querySelector('.btn-download-pdf');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Try to use file directly, then data URL, then object URL
            if (result.pdfFile) {
                const url = URL.createObjectURL(result.pdfFile);
                const link = document.createElement('a');
                link.href = url;
                link.download = result.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            } else if (result.pdfDataUrl) {
                const link = document.createElement('a');
                link.href = result.pdfDataUrl;
                link.download = result.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (result.pdfUrl) {
                const link = document.createElement('a');
                link.href = result.pdfUrl;
                link.download = result.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }
}

async function renderPDFWithPDFJS(result, modal) {
    const viewer = modal.querySelector('#pdfViewer');
    if (!viewer) return;
    
    try {
        // Load PDF - prefer file, then data URL, then object URL
        let pdf;
        if (result.pdfFile) {
            // Use file directly (most reliable)
            const arrayBuffer = await result.pdfFile.arrayBuffer();
            pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        } else if (result.pdfDataUrl) {
            // Use data URL
            const base64Data = result.pdfDataUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        } else if (result.pdfUrl) {
            // Use object URL as last resort
            pdf = await pdfjsLib.getDocument({ url: result.pdfUrl }).promise;
        } else {
            throw new Error('No PDF source available');
        }
        
        viewer.innerHTML = ''; // Clear loading message
        
        // Render all pages
        const container = document.createElement('div');
        container.className = 'pdf-pages-container';
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const pageDiv = document.createElement('div');
            pageDiv.className = 'pdf-page';
            pageDiv.appendChild(canvas);
            container.appendChild(pageDiv);
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
        }
        
        viewer.appendChild(container);
        
    } catch (error) {
        console.error('Error rendering PDF:', error);
        viewer.innerHTML = '<div class="pdf-error">Failed to render PDF. Please use the download or open link.</div>';
        // Show iframe as fallback
        const iframe = modal.querySelector('.pdf-preview-iframe');
        if (iframe) {
            iframe.style.display = 'block';
            viewer.style.display = 'none';
        }
        throw error;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Interview Questions Generator - Per Profile
async function generateInterviewQuestions() {
    if (selectedCVs.size === 0) {
        showError('Please select at least one CV to generate interview questions.');
        return;
    }
    
    const numQuestions = parseInt(document.getElementById('numQuestions').value) || 5;
    if (numQuestions < 1 || numQuestions > 20) {
        showError('Number of questions must be between 1 and 20.');
        return;
    }
    
    const questionsContainer = document.getElementById('interviewQuestions');
    questionsContainer.innerHTML = '<div class="loading-questions">Generating questions for each candidate...</div>';
    
    const selectedResults = results.filter(r => selectedCVs.has(r.fileName));
    const sortedSelected = [...selectedResults].sort((a, b) => b.totalScore - a.totalScore);
    
    questionsContainer.innerHTML = '';
    
    // Generate questions for each CV separately
    for (const result of sortedSelected) {
        try {
            const candidateName = result.name || result.fileName.replace('.pdf', '');
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'questions-per-candidate';
            const safeName = escapeHtml(candidateName);
            sectionDiv.innerHTML = `
                <div class="candidate-questions-header">
                    <h4>${safeName}</h4>
                    <button class="btn-download-questions" data-candidate="${safeName.replace(/'/g, "&#39;")}">📥 Download</button>
                </div>
                <div class="candidate-questions-list" data-candidate="${safeName}">
                    <div class="loading-questions">Generating questions...</div>
                </div>
            `;
            
            // Add click handler for download button
            const downloadBtn = sectionDiv.querySelector('.btn-download-questions');
            downloadBtn.addEventListener('click', () => {
                downloadQuestions(candidateName, downloadBtn);
            });
            
            questionsContainer.appendChild(sectionDiv);
            
            const prompt = `You are an expert HR interviewer. Generate ${numQuestions} interview questions for the following candidate based on their CV and the job position.

Job Position Description:
${jobDescription}

Candidate CV:
CV for ${candidateName}:
${result.cvText}

Generate ${numQuestions} thoughtful interview questions that:
1. Identify gaps between the candidate's experience and the job requirements
2. Explore their strengths and relevant experience
3. Test their knowledge and skills mentioned in the CV
4. Assess cultural fit and soft skills
5. Address any concerns or questions that arise from reviewing their background

Return ONLY a JSON array of question objects in this format (no markdown, no code blocks):
[
  {
    "question": "Question text here",
    "purpose": "Brief explanation of why this question is relevant"
  },
  ...
]`;

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
                            content: 'You are an expert HR interviewer. Always respond with valid JSON only, no markdown formatting.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            
            // Remove markdown code blocks if present
            if (content.startsWith('```')) {
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            }
            
            const questions = JSON.parse(content);
            
            // Store questions for download
            result.interviewQuestions = questions;
            
            // Display questions
            const questionsList = sectionDiv.querySelector('.candidate-questions-list');
            questionsList.innerHTML = questions.map((q, index) => `
                <div class="question-item">
                    <div class="question-number">Q${index + 1}</div>
                    <div class="question-content">
                        <div class="question-text">${escapeHtml(q.question)}</div>
                        <div class="question-purpose">${escapeHtml(q.purpose)}</div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            const questionsList = sectionDiv.querySelector('.candidate-questions-list');
            questionsList.innerHTML = `<div class="error-message">Error generating questions: ${error.message}</div>`;
            console.error('Interview questions error:', error);
        }
    }
}

// Download questions as Word document
window.downloadQuestions = function(candidateName, button) {
    const result = results.find(r => (r.name || r.fileName.replace('.pdf', '')) === candidateName);
    if (!result || !result.interviewQuestions) {
        showError('Questions not available for download.');
        return;
    }
    
    const questions = result.interviewQuestions;
    const jobDesc = jobDescription.substring(0, 200) + (jobDescription.length > 200 ? '...' : '');
    const safeName = escapeHtml(candidateName);
    const safeJobDesc = escapeHtml(jobDesc);
    
    // Create Word document content
    const questionsHtml = questions.map((q, index) => {
        const safeQuestion = escapeHtml(q.question);
        const safePurpose = escapeHtml(q.purpose);
        return `
        <div class="question-item">
            <div class="question-text">Q${index + 1}: ${safeQuestion}</div>
            <div class="question-purpose">Purpose: ${safePurpose}</div>
        </div>`;
    }).join('');
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Interview Questions - ${safeName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #0066ff; }
        h2 { color: #333; margin-top: 30px; }
        .question-item { margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #0066ff; }
        .question-text { font-weight: bold; margin-bottom: 8px; }
        .question-purpose { font-style: italic; color: #666; }
    </style>
</head>
<body>
    <h1>Interview Questions</h1>
    <h2>Candidate: ${safeName}</h2>
    <p><strong>Job Position:</strong> ${safeJobDesc}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <hr>
    ${questionsHtml}
</body>
</html>`;
    
    // Create blob and download
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Interview_Questions_${candidateName.replace(/[^a-z0-9]/gi, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Chat Interface
function initializeChat() {
    updateChatCVSelector();
}

function updateChatCVSelector() {
    const cvList = document.getElementById('chatCVList');
    const dropdownText = document.getElementById('chatDropdownText');
    
    if (results.length === 0) {
        cvList.innerHTML = '<p class="no-cvs">No CVs available. Analyze CVs first.</p>';
        dropdownText.textContent = 'No CVs available';
        return;
    }
    
    renderChatCVList();
    updateChatDropdownText();
}

function renderChatCVList() {
    const cvList = document.getElementById('chatCVList');
    const searchTerm = document.getElementById('chatCVSearch').value.toLowerCase();
    
    cvList.innerHTML = '';
    
    const filteredResults = results.filter(result => {
        const name = (result.name || '').toLowerCase();
        const fileName = result.fileName.toLowerCase();
        return name.includes(searchTerm) || fileName.includes(searchTerm);
    });
    
    filteredResults.forEach(result => {
        const item = document.createElement('div');
        item.className = 'chat-cv-dropdown-item';
        const isSelected = chatCVSelection.has(result.fileName);
        item.innerHTML = `
            <input type="checkbox" id="chat-cv-${result.fileName}" value="${result.fileName}" ${isSelected ? 'checked' : ''} />
            <label for="chat-cv-${result.fileName}">${escapeHtml(result.name || result.fileName)}</label>
        `;
        
        const input = item.querySelector('input');
        input.addEventListener('change', (e) => {
            if (e.target.checked) {
                chatCVSelection.add(result.fileName);
            } else {
                chatCVSelection.delete(result.fileName);
            }
            updateChatDropdownText();
        });
        
        cvList.appendChild(item);
    });
}

function filterChatCVs() {
    renderChatCVList();
}

function updateChatDropdownText() {
    const dropdownText = document.getElementById('chatDropdownText');
    const count = chatCVSelection.size;
    
    if (count === 0) {
        dropdownText.textContent = 'Select CVs...';
    } else if (count === 1) {
        const selected = Array.from(chatCVSelection)[0];
        const result = results.find(r => r.fileName === selected);
        dropdownText.textContent = result ? (result.name || result.fileName) : '1 CV selected';
    } else {
        dropdownText.textContent = `${count} CVs selected`;
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    
    if (!question) return;
    
    if (chatCVSelection.size === 0) {
        showError('Please select at least one CV to ask questions about.');
        return;
    }
    
    if (!apiKey) {
        showError('Please enter your OpenAI API key first.');
        return;
    }
    
    // Add user message to chat
    addChatMessage('user', question);
    input.value = '';
    
    // Show loading
    const loadingId = addChatMessage('assistant', 'Thinking...', true);
    
    try {
        const selectedResults = results.filter(r => chatCVSelection.has(r.fileName));
        const cvContext = selectedResults.map(r => {
            return `CV: ${r.name || r.fileName}\nScore: ${r.totalScore.toFixed(1)}/40\n\nCV Content:\n${r.cvText}`;
        }).join('\n\n---\n\n');
        
        const prompt = `You are an expert HR recruiter assistant. Answer the following question based on the provided CV(s) and job position context.

Job Position Description:
${jobDescription}

Selected CV(s):
${cvContext}

Question: ${question}

Provide a helpful, detailed answer based on the CV information. Be specific and reference relevant details from the CV(s).`;

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
                        content: 'You are an expert HR recruiter assistant. Provide helpful, detailed answers based on CV information.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const answer = data.choices[0].message.content.trim();
        
        // Update loading message with answer
        updateChatMessage(loadingId, 'assistant', answer);
        
        // Save to history
        chatHistory.push({ question, answer, cvSelection: Array.from(chatCVSelection) });
        
    } catch (error) {
        updateChatMessage(loadingId, 'assistant', `Error: ${error.message}`);
        console.error('Chat error:', error);
    }
}

function addChatMessage(role, content, isLoading = false) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageId = 'msg-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message chat-message-${role}`;
    messageDiv.id = messageId;
    messageDiv.innerHTML = `
        <div class="chat-message-content">${escapeHtml(content)}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageId;
}

function updateChatMessage(messageId, role, content) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
        messageDiv.innerHTML = `<div class="chat-message-content">${escapeHtml(content)}</div>`;
        messageDiv.scrollIntoView({ behavior: 'smooth' });
    }
}

function toggleChat() {
    const chatSection = document.getElementById('chatSection');
    const openBtn = document.getElementById('openChatBtn');
    
    if (chatSection.classList.contains('hidden')) {
        chatSection.classList.remove('hidden');
        openBtn.classList.add('hidden');
        document.body.classList.remove('chat-hidden');
    } else {
        chatSection.classList.add('hidden');
        openBtn.classList.remove('hidden');
        document.body.classList.add('chat-hidden');
    }
}

function updateProgress(percent) {
    document.getElementById('progressFill').style.width = percent + '%';
}

function showError(message) {
    const errorSection = document.getElementById('errorSection');
    errorSection.textContent = `Error: ${message}`;
    errorSection.classList.remove('hidden');
}

