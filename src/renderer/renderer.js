// Global state
let selectedImages = [];
let processedImages = [];

// DOM Elements
const selectImagesBtn = document.getElementById('selectImagesBtn');
const selectedImagesDiv = document.getElementById('selectedImages');
const settingsSection = document.getElementById('settingsSection');
const ratioSlider = document.getElementById('ratioSlider');
const ratioValue = document.getElementById('ratioValue');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsSummary = document.getElementById('resultsSummary');
const saveBtn = document.getElementById('saveBtn');
const replaceBtn = document.getElementById('replaceBtn');

// Event Listeners
selectImagesBtn.addEventListener('click', async () => {
  const images = await window.electronAPI.selectImages();
  if (images && images.length > 0) {
    selectedImages = images;
    displaySelectedImages();
    settingsSection.style.display = 'block';
    resultsSection.style.display = 'none';
  }
});

ratioSlider.addEventListener('input', (e) => {
  ratioValue.textContent = `${e.target.value}%`;
});

qualitySlider.addEventListener('input', (e) => {
  qualityValue.textContent = e.target.value;
});

processBtn.addEventListener('click', async () => {
  if (selectedImages.length === 0) return;
  
  settingsSection.style.display = 'none';
  progressSection.style.display = 'block';
  resultsSection.style.display = 'none';
  
  const ratio = ratioSlider.value / 100;
  const quality = parseInt(qualitySlider.value);
  
  try {
    progressFill.style.width = '30%';
    progressText.textContent = 'Processing images...';
    
    processedImages = await window.electronAPI.processImages({
      imagePaths: selectedImages,
      ratio: ratio,
      quality: quality,
    });
    
    progressFill.style.width = '100%';
    progressText.textContent = 'Complete!';
    
    setTimeout(() => {
      showResults();
    }, 500);
  } catch (error) {
    progressText.textContent = `Error: ${error.message}`;
    console.error('Processing error:', error);
  }
});

saveBtn.addEventListener('click', async () => {
  if (processedImages.length === 0) return;
  
  const saveFolder = await window.electronAPI.selectSaveFolder();
  if (!saveFolder) return;
  
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    const savedPaths = await window.electronAPI.saveImages({
      processedImages: processedImages,
      saveFolder: saveFolder,
    });
    
    alert(`Successfully saved ${savedPaths.length} image(s) to:\n${saveFolder}`);
    resetApp();
  } catch (error) {
    alert(`Error saving images: ${error.message}`);
    console.error('Save error:', error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="btn-icon">💾</span> Save to Folder';
  }
});

replaceBtn.addEventListener('click', async () => {
  if (processedImages.length === 0) return;
  
  const confirmed = confirm(
    `Are you sure you want to replace ${processedImages.length} original image(s)?\n\n` +
    `Backup copies will be created with "_backup" suffix.`
  );
  
  if (!confirmed) return;
  
  try {
    replaceBtn.disabled = true;
    replaceBtn.textContent = 'Replacing...';
    
    const replacedPaths = await window.electronAPI.replaceImages({
      processedImages: processedImages,
    });
    
    alert(`Successfully replaced ${replacedPaths.length} image(s).\n\nBackup copies have been created.`);
    resetApp();
  } catch (error) {
    alert(`Error replacing images: ${error.message}`);
    console.error('Replace error:', error);
  } finally {
    replaceBtn.disabled = false;
    replaceBtn.innerHTML = '<span class="btn-icon">🔄</span> Replace Originals';
  }
});

// Helper Functions
function displaySelectedImages() {
  selectedImagesDiv.innerHTML = '';
  selectedImages.forEach((path) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.textContent = path.split('/').pop() || path.split('\\').pop();
    selectedImagesDiv.appendChild(item);
  });
}

function showResults() {
  progressSection.style.display = 'none';
  resultsSection.style.display = 'block';
  
  const successful = processedImages.filter((img) => !img.error).length;
  const failed = processedImages.filter((img) => img.error).length;
  
  let summary = `Processed ${successful} image(s) successfully.`;
  if (failed > 0) {
    summary += ` ${failed} failed.`;
  }
  
  if (successful > 0) {
    const totalOriginalSize = processedImages
      .filter((img) => !img.error)
      .reduce((sum, img) => sum + (img.originalSize || 0), 0);
    const totalNewSize = processedImages
      .filter((img) => !img.error)
      .reduce((sum, img) => sum + (img.size || 0), 0);
    const savings = ((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1);
    
    summary += `\nSize reduction: ${savings}%`;
  }
  
  resultsSummary.textContent = summary;
}

function resetApp() {
  selectedImages = [];
  processedImages = [];
  selectedImagesDiv.innerHTML = '';
  settingsSection.style.display = 'none';
  progressSection.style.display = 'none';
  resultsSection.style.display = 'none';
  ratioSlider.value = 100;
  ratioValue.textContent = '100%';
  qualitySlider.value = 85;
  qualityValue.textContent = '85';
  progressFill.style.width = '0%';
}

