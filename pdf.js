if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let currentPdfDoc = null;
let currentPage = 1;
let currentScale = 1.0;

async function renderPDF(pdfUrl, container) {
    try {
        // Check if PDF.js is loaded
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js is not loaded');
        }

        // Create PDF viewer container
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

        // Load the PDF
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        currentPdfDoc = await loadingTask.promise;
        
        // Update total pages
        document.getElementById('totalPages').textContent = currentPdfDoc.numPages;
        
        // Initial render
        await renderPage(1);
        
        // Add event listeners
        document.getElementById('prevPage').addEventListener('click', previousPage);
        document.getElementById('nextPage').addEventListener('click', nextPage);
        document.getElementById('zoomIn').addEventListener('click', zoomIn);
        document.getElementById('zoomOut').addEventListener('click', zoomOut);
        
        // Enable touch swipe for mobile
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
        
        // Handle device pixel ratio for sharp rendering on mobile
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale * pixelRatio });
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Scale canvas display size
        canvas.style.width = (viewport.width / pixelRatio) + 'px';
        canvas.style.height = (viewport.height / pixelRatio) + 'px';
        
        // Scale context to handle device pixel ratio
        context.scale(pixelRatio, pixelRatio);
        
        // Render the page
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Update current page display
        currentPage = pageNumber;
        document.getElementById('currentPage').textContent = pageNumber;
        
        // Update buttons state
        document.getElementById('prevPage').disabled = pageNumber <= 1;
        document.getElementById('nextPage').disabled = pageNumber >= currentPdfDoc.numPages;
        
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

function previousPage() {
    if (currentPage <= 1) return;
    renderPage(currentPage - 1);
}

function nextPage() {
    if (!currentPdfDoc || currentPage >= currentPdfDoc.numPages) return;
    renderPage(currentPage + 1);
}

function zoomIn() {
    currentScale = Math.min(currentScale * 1.25, 3.0);
    renderPage(currentPage);
}

function zoomOut() {
    currentScale = Math.max(currentScale * 0.8, 0.5);
    renderPage(currentPage);
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