if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let currentPdfDoc = null;
let currentPage = 1;
let initialScale = 1.0; 
let currentScale = 1.0;

async function renderPDF(base64Data, container) {
    try {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js is not loaded');
        }

        container.innerHTML = `
            <div class="pdf-viewer-container">
                <div class="pdf-viewer-toolbar">
                    <div class="pdf-viewer-controls">
                        <button class="pdf-viewer-button" id="prevPage">
                            <i class="fas fa-chevron-right"></i>
                            הקודם
                        </button>
                        <span class="pdf-page-display">
                            עמוד <span id="currentPage">1</span> מתוך <span id="totalPages">?</span>
                        </span>
                        <button class="pdf-viewer-button" id="nextPage">
                            הבא
                            <i class="fas fa-chevron-left"></i>
                        </button>
                    </div>
                    <div class="pdf-viewer-controls">
                        <button class="pdf-viewer-button" id="zoomOut">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="pdf-viewer-button" id="zoomIn">
                            <i class="fas fa-search-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="pdf-canvas-container">
                    <canvas id="pdfCanvas"></canvas>
                </div>
            </div>
        `;

        // Convert base64 to binary data
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Create the proper parameter object for getDocument with binary data
        const loadingTask = pdfjsLib.getDocument({
            data: bytes.buffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
        });

        currentPdfDoc = await loadingTask.promise;
        
        document.getElementById('totalPages').textContent = currentPdfDoc.numPages;
        
        const page = await currentPdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Calculate available height and width
        const containerHeight = container.clientHeight - 60;
        const containerWidth = container.clientWidth - 40;
        
        // Calculate scales for both width and height fitting
        const scaleByHeight = containerHeight / viewport.height;
        const scaleByWidth = containerWidth / viewport.width;
        
        // Set initial scale and current scale
        initialScale = Math.min(scaleByHeight, scaleByWidth);
        currentScale = initialScale;
        
        await renderPage(1);
        
        // Add event listeners
        document.getElementById('prevPage').addEventListener('click', previousPage);
        document.getElementById('nextPage').addEventListener('click', nextPage);
        document.getElementById('zoomIn').addEventListener('click', zoomIn);
        document.getElementById('zoomOut').addEventListener('click', zoomOut);
        
        enableTouchNavigation(container.querySelector('.pdf-canvas-container'));
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                שגיאה בטעינת ה-PDF. אנא נסה שוב.
            </div>
        `;
    }
}

async function renderPage(pageNumber) {
    if (!currentPdfDoc) return;
    
    try {
        const page = await currentPdfDoc.getPage(pageNumber);
        const canvas = document.getElementById('pdfCanvas');
        const context = canvas.getContext('2d');
        
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale });
        
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        
        context.scale(pixelRatio, pixelRatio);
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        currentPage = pageNumber;
        document.getElementById('currentPage').textContent = pageNumber;
        
        document.getElementById('prevPage').disabled = pageNumber <= 1;
        document.getElementById('nextPage').disabled = pageNumber >= currentPdfDoc.numPages;
        
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

// Update the CSS
const style = document.createElement('style');
style.textContent = `
.pdf-viewer-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
}

.pdf-viewer-toolbar {
    padding: 10px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.pdf-canvas-container {
    flex: 1;
    overflow: auto;
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: flex-start; /* Changed from center to allow proper scrolling */
    background: var(--bg-secondary);
}

#pdfCanvas {
    box-shadow: var(--shadow-md);
    display: block; /* Ensures proper rendering */
}

.preview-container.pdf-mode {
    padding: 0;
    background: var(--bg-secondary);
}

.pdf-viewer-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pdf-viewer-button:not(:disabled):hover {
    background: var(--navy-light);
}

.preview-container.pdf-mode .pdf-viewer-container {
    height: calc(50vh - 4rem);
}

@media (max-width: 768px) {
    .preview-container.pdf-mode .pdf-viewer-container {
        height: calc(70vh - 4rem);
    }
}
`;
document.head.appendChild(style);

function previousPage() {
    if (currentPage <= 1) return;
    renderPage(currentPage - 1);
}

function nextPage() {
    if (!currentPdfDoc || currentPage >= currentPdfDoc.numPages) return;
    renderPage(currentPage + 1);
}

function zoomIn() {
    const maxScale = initialScale * 3; // Maximum 3x the initial fitting scale
    currentScale = Math.min(currentScale * 1.25, maxScale);
    renderPage(currentPage);
    updateZoomButtons();
}

function zoomOut() {
    const minScale = initialScale * 0.5; // Minimum 0.5x the initial fitting scale
    currentScale = Math.max(currentScale * 0.8, minScale);
    renderPage(currentPage);
    updateZoomButtons();
}

function updateZoomButtons() {
    const zoomInButton = document.getElementById('zoomIn');
    const zoomOutButton = document.getElementById('zoomOut');
    
    if (zoomInButton) {
        zoomInButton.disabled = currentScale >= initialScale * 3;
    }
    if (zoomOutButton) {
        zoomOutButton.disabled = currentScale <= initialScale * 0.5;
    }
}
function enableTouchNavigation(element) {
    let touchStartX = 0;
    let touchStartY = 0;
    
    element.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    element.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // Only handle horizontal swipes
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                previousPage();
            } else {
                nextPage();
            }
        }
    }, { passive: true });
}