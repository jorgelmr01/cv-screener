// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let apiKey = '';
let jobDescription = '';
let personalizedInstructions = '';
let cvFiles = [];
let results = [];
let selectedModel = 'gpt-4o-mini';
let selectedCVs = new Set();
const MAX_SELECTED = 10;
let evaluationCriteria = {
    relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo. Considera habilidades, experiencia y ajuste general.' },
    education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas. El título principal cuenta el 80% del valor, certificaciones adicionales, programas de intercambio, etc. cuentan el 20%.' },
    previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores y el nivel del último puesto ocupado.' },
    proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares, certificaciones, aprendizaje continuo e iniciativa mostrada más allá de los requisitos básicos del trabajo.' }
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
        showError('Por favor completa todos los campos y selecciona al menos un archivo CV.');
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
            loadingText.textContent = `Procesando ${i + 1}/${cvFiles.length}: ${file.name}...`;
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
                
                // Show detailed error message
                let errorMsg = `Error al procesar ${file.name}: `;
                if (fileError.message) {
                    errorMsg += fileError.message;
                } else {
                    errorMsg += 'Ocurrió un error desconocido';
                }
                
                // Check if it's a model-related error
                if (fileError.message && (fileError.message.includes('model') || fileError.message.includes('invalid') || fileError.message.includes('not found'))) {
                    errorMsg += `. El modelo "${selectedModel}" puede no estar disponible. Por favor intenta con un modelo diferente (ej., gpt-4o-mini).`;
                }
                
                showError(errorMsg);
                loadingText.textContent = `Error al procesar ${file.name}, continuando...`;
            }
            
            // Allow browser to breathe between files
            if (i % 5 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        updateProgress(100);
        loadingText.textContent = '¡Análisis completado!';
        
        // Calculate total scores for all results
        results.forEach(result => {
            result.totalScore = result.relevance + result.education + result.previousJobs + result.proactivity;
        });
        
        // Check if we have any results
        if (results.length === 0) {
            loadingSection.classList.add('hidden');
            showError('No se analizaron CVs exitosamente. Por favor revisa los mensajes de error arriba e intenta de nuevo. Asegúrate de que el modelo GPT seleccionado esté disponible y tu clave API sea válida.');
            return;
        }
        
        // Display results
        setTimeout(() => {
            loadingSection.classList.add('hidden');
            displayResults();
            
            // Show warning if some files failed
            const failedCount = cvFiles.length - results.length;
            if (failedCount > 0) {
                showError(`Advertencia: ${failedCount} de ${cvFiles.length} CV(s) fallaron al analizar. Solo ${results.length} CV(s) fueron procesados exitosamente.`);
            }
        }, 500);
        
    } catch (error) {
        loadingSection.classList.add('hidden');
        let errorMsg = `Error durante el análisis: ${error.message}`;
        
        // Add helpful suggestions for common errors
        if (error.message.includes('model') || error.message.includes('not available')) {
            errorMsg += '\n\nSugerencia: Intenta usar gpt-4o-mini o gpt-4o en su lugar.';
        } else if (error.message.includes('API key') || error.message.includes('unauthorized')) {
            errorMsg += '\n\nSugerencia: Por favor verifica que tu clave API de OpenAI sea correcta y tenga créditos suficientes.';
        }
        
        showError(errorMsg);
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
                reject(new Error(`Error al analizar el PDF: ${error.message}`));
            }
        };
        
        fileReader.onerror = () => reject(new Error('Error al leer el archivo'));
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

Instrucciones Personalizadas Adicionales:
${personalizedInstructions}

IMPORTANTE: Aplica estas instrucciones personalizadas al evaluar el CV. Ajusta las puntuaciones en consecuencia si las instrucciones especifican exclusiones (ej., excluir candidatos de ciertas escuelas/empresas) o priorizaciones.`;
    }
    
    // Build criteria section from custom criteria
    const criteriaSection = Object.entries(evaluationCriteria).map(([key, crit], index) => {
        return `${index + 1}. **${crit.name}** (0-10): ${crit.desc}`;
    }).join('\n\n');
    
    const prompt = `Eres un reclutador de recursos humanos experto evaluando un CV generado por LinkedIn. Analiza el siguiente CV y proporciona una evaluación detallada. Responde TODO en español.

Contenido del CV:
${cvText}

Contexto del Puesto de Trabajo:
${jobDescription}${instructionsSection}

Evalúa el CV en las siguientes 4 dimensiones (cada una puntuada de 0-10):

${criteriaSection}

Responde SOLO con un objeto JSON válido en este formato exacto (sin markdown, sin bloques de código, solo el JSON):
{
  "relevance": <número 0-10>,
  "education": <número 0-10>,
  "previousJobs": <número 0-10>,
  "proactivity": <número 0-10>,
  "analysis": {
    "relevance": "<explicación breve en español>",
    "education": "<explicación breve en español>",
    "previousJobs": "<explicación breve en español>",
    "proactivity": "<explicación breve en español>"
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
                        content: 'Eres un reclutador de recursos humanos experto. Siempre responde con JSON válido únicamente, sin formato markdown. Todas las respuestas deben estar en español.'
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
            const errorMessage = errorData.error?.message || `Error de API: ${response.status}`;
            
            // Check for model-related errors
            if (errorMessage.includes('model') || errorMessage.includes('not found') || errorMessage.includes('invalid') || errorMessage.includes('does not exist')) {
                throw new Error(`El modelo "${selectedModel}" no está disponible o es inválido. Error: ${errorMessage}. Por favor selecciona un modelo diferente (ej., gpt-4o-mini).`);
            }
            
            throw new Error(`Error de API: ${errorMessage}`);
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
                throw new Error(`Puntuación inválida para ${key}: ${analysis[key]}`);
            }
        });
        
        return analysis;
    } catch (error) {
        // Enhance error messages
        if (error.message.includes('JSON')) {
            throw new Error(`Error al analizar la respuesta de IA para ${fileName}. La IA puede haber devuelto JSON inválido.`);
        }
        if (error.message.includes('model') || error.message.includes('not available')) {
            throw error; // Re-throw model errors as-is
        }
        throw new Error(`Error al analizar ${fileName}: ${error.message}`);
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
                <p>Selecciona CVs de la barra lateral para ver el análisis detallado</p>
                <small>Puedes seleccionar hasta 10 CVs a la vez</small>
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
            <div class="candidate-name">${result.name || 'Nombre no encontrado'}</div>
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
            <h4>Análisis:</h4>
            <p><strong>${escapeHtml(evaluationCriteria.relevance.name)}:</strong> ${escapeHtml(result.analysis.relevance)}</p>
            <p><strong>${escapeHtml(evaluationCriteria.education.name)}:</strong> ${escapeHtml(result.analysis.education)}</p>
            <p><strong>${escapeHtml(evaluationCriteria.previousJobs.name)}:</strong> ${escapeHtml(result.analysis.previousJobs)}</p>
            <p><strong>${escapeHtml(evaluationCriteria.proactivity.name)}:</strong> ${escapeHtml(result.analysis.proactivity)}</p>
        </div>
        
        <div class="preview-hint">Haz clic para previsualizar el CV completo</div>
    `;
    
    return card;
}

async function showCVPreview(result) {
    if (!result.pdfUrl && !result.pdfDataUrl && !result.pdfFile) {
        showError('Vista previa del PDF no disponible. El archivo puede haber sido eliminado.');
        return;
    }
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'cv-modal';
    
    // Ensure we have a valid URL for opening in new tab
    let pdfUrlForOpen = null;
    if (result.pdfDataUrl) {
        pdfUrlForOpen = result.pdfDataUrl; // Data URLs work best for opening
    } else if (result.pdfFile) {
        // Create a fresh object URL from the file
        pdfUrlForOpen = URL.createObjectURL(result.pdfFile);
    } else if (result.pdfUrl) {
        pdfUrlForOpen = result.pdfUrl;
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Vista Previa del CV: ${escapeHtml(result.fileName)}</h2>
                <button class="modal-close" aria-label="Cerrar">×</button>
            </div>
            <div class="modal-body">
                <div class="pdf-container">
                    <div id="pdfViewer" class="pdf-viewer-canvas">
                        <div class="pdf-loading">Cargando PDF...</div>
                    </div>
                    <iframe 
                        src="${pdfUrlForOpen || ''}#toolbar=1&navpanes=1&scrollbar=1" 
                        class="pdf-preview-iframe" 
                        type="application/pdf"
                        title="Vista Previa del PDF"
                        style="display: none;">
                    </iframe>
                </div>
                <div class="pdf-fallback">
                    <button class="btn-download-pdf">📥 Descargar PDF</button>
                    <button class="btn-open-pdf" id="pdfOpenBtn">🔗 Abrir en nueva pestaña</button>
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
        if (iframe && viewer && pdfUrlForOpen) {
            viewer.style.display = 'none';
            iframe.style.display = 'block';
            iframe.src = pdfUrlForOpen + '#toolbar=1&navpanes=1&scrollbar=1';
        }
    }
    
    // Close button handler
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
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
    
    // Open in new tab button handler
    const pdfOpenBtn = modal.querySelector('#pdfOpenBtn');
    if (pdfOpenBtn) {
        pdfOpenBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            try {
                let urlToOpen = null;
                
                // Prefer data URL as it's most reliable for opening in new tab
                if (result.pdfDataUrl) {
                    urlToOpen = result.pdfDataUrl;
                } else if (result.pdfFile) {
                    // Create a fresh blob URL from the file
                    urlToOpen = URL.createObjectURL(result.pdfFile);
                } else if (result.pdfUrl) {
                    // Try to use existing URL
                    urlToOpen = result.pdfUrl;
                }
                
                if (!urlToOpen) {
                    showError('No se puede abrir el PDF. El archivo puede haber sido eliminado.');
                    return;
                }
                
                // Method 1: Direct window.open with URL
                const newWindow = window.open(urlToOpen, '_blank', 'noopener,noreferrer');
                
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    // Popup blocked or failed - try creating a link
                    const link = document.createElement('a');
                    link.href = urlToOpen;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                    }, 100);
                }
            } catch (error) {
                console.error('Error opening PDF:', error);
                showError('Error al abrir el PDF en nueva pestaña. Por favor intenta descargarlo en su lugar.');
            }
        });
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
        showError('Por favor selecciona al menos un CV para generar preguntas de entrevista.');
        return;
    }
    
    const numQuestions = parseInt(document.getElementById('numQuestions').value) || 5;
    if (numQuestions < 1 || numQuestions > 20) {
        showError('El número de preguntas debe estar entre 1 y 20.');
        return;
    }
    
    const questionsContainer = document.getElementById('interviewQuestions');
    questionsContainer.innerHTML = '<div class="loading-questions">Generando preguntas para cada candidato...</div>';
    
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
                    <button class="btn-download-questions" data-candidate="${safeName.replace(/'/g, "&#39;")}">📥 Descargar</button>
                </div>
                <div class="candidate-questions-list" data-candidate="${safeName}">
                    <div class="loading-questions">Generando preguntas...</div>
                </div>
            `;
            
            // Add click handler for download button
            const downloadBtn = sectionDiv.querySelector('.btn-download-questions');
            downloadBtn.addEventListener('click', () => {
                downloadQuestions(candidateName, downloadBtn);
            });
            
            questionsContainer.appendChild(sectionDiv);
            
            const prompt = `Eres un entrevistador de recursos humanos experto. Genera ${numQuestions} preguntas de entrevista en español para el siguiente candidato basándote en su CV y el puesto de trabajo. Responde TODO en español.

Descripción del Puesto de Trabajo:
${jobDescription}

CV del Candidato:
CV de ${candidateName}:
${result.cvText}

Genera ${numQuestions} preguntas de entrevista reflexivas que:
1. Identifiquen brechas entre la experiencia del candidato y los requisitos del trabajo
2. Exploren sus fortalezas y experiencia relevante
3. Prueben su conocimiento y habilidades mencionadas en el CV
4. Evalúen el ajuste cultural y habilidades blandas
5. Aborden cualquier preocupación o pregunta que surja al revisar su historial

Devuelve SOLO un array JSON de objetos de pregunta en este formato (sin markdown, sin bloques de código):
[
  {
    "question": "Texto de la pregunta aquí",
    "purpose": "Breve explicación de por qué esta pregunta es relevante"
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
                            content: 'Eres un entrevistador de recursos humanos experto. Siempre responde con JSON válido únicamente, sin formato markdown. Todas las respuestas deben estar en español.'
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
                throw new Error(errorData.error?.message || `Error de API: ${response.status}`);
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
                    <div class="question-number">P${index + 1}</div>
                    <div class="question-content">
                        <div class="question-text">${escapeHtml(q.question)}</div>
                        <div class="question-purpose">${escapeHtml(q.purpose)}</div>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            const questionsList = sectionDiv.querySelector('.candidate-questions-list');
            questionsList.innerHTML = `<div class="error-message">Error al generar preguntas: ${error.message}</div>`;
            console.error('Interview questions error:', error);
        }
    }
}

// Download questions as Word document
window.downloadQuestions = function(candidateName, button) {
    const result = results.find(r => (r.name || r.fileName.replace('.pdf', '')) === candidateName);
    if (!result || !result.interviewQuestions) {
        showError('Las preguntas no están disponibles para descargar.');
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
            <div class="question-text">P${index + 1}: ${safeQuestion}</div>
            <div class="question-purpose">Propósito: ${safePurpose}</div>
        </div>`;
    }).join('');
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Preguntas de Entrevista - ${safeName}</title>
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
    <h1>Preguntas de Entrevista</h1>
    <h2>Candidato: ${safeName}</h2>
    <p><strong>Puesto de Trabajo:</strong> ${safeJobDesc}</p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
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
        cvList.innerHTML = '<p class="no-cvs">No hay CVs disponibles. Analiza CVs primero.</p>';
        dropdownText.textContent = 'No hay CVs disponibles';
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
        dropdownText.textContent = 'Seleccionar CVs...';
    } else if (count === 1) {
        const selected = Array.from(chatCVSelection)[0];
        const result = results.find(r => r.fileName === selected);
        dropdownText.textContent = result ? (result.name || result.fileName) : '1 CV seleccionado';
    } else {
        dropdownText.textContent = `${count} CVs seleccionados`;
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    
    if (!question) return;
    
    if (chatCVSelection.size === 0) {
        showError('Por favor selecciona al menos un CV para hacer preguntas.');
        return;
    }
    
    if (!apiKey) {
        showError('Por favor ingresa tu clave API de OpenAI primero.');
        return;
    }
    
    // Add user message to chat
    addChatMessage('user', question);
    input.value = '';
    
    // Show loading
    const loadingId = addChatMessage('assistant', 'Pensando...', true);
    
    try {
        const selectedResults = results.filter(r => chatCVSelection.has(r.fileName));
        const cvContext = selectedResults.map(r => {
            return `CV: ${r.name || r.fileName}\nPuntuación: ${r.totalScore.toFixed(1)}/40\n\nContenido del CV:\n${r.cvText}`;
        }).join('\n\n---\n\n');
        
        const prompt = `Eres un asistente experto de reclutamiento de recursos humanos. Responde la siguiente pregunta basándote en el/los CV(s) proporcionado(s) y el contexto del puesto de trabajo. Responde TODO en español.

Descripción del Puesto de Trabajo:
${jobDescription}

CV(s) Seleccionado(s):
${cvContext}

Pregunta: ${question}

Proporciona una respuesta útil y detallada basada en la información del CV. Sé específico y referencia detalles relevantes del/los CV(s).`;

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
                        content: 'Eres un asistente experto de reclutamiento de recursos humanos. Proporciona respuestas útiles y detalladas basadas en información de CVs. Todas las respuestas deben estar en español.'
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
            throw new Error(errorData.error?.message || `Error de API: ${response.status}`);
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
    errorSection.innerHTML = `<strong>⚠️ Error:</strong> ${escapeHtml(message)}`;
    errorSection.classList.remove('hidden');
    
    // Scroll to error section
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide after 10 seconds for warnings, but keep errors visible
    if (message.toLowerCase().includes('warning')) {
        setTimeout(() => {
            errorSection.classList.add('hidden');
        }, 10000);
    }
}

