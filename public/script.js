// Flower Market Kyrgyzstan - Frontend
// Telegram WebApp с автоматическими комментариями

let currentStep = 1;
let mediaFiles = [];
let selectedContactType = 'telegram';
let tg = window.Telegram?.WebApp;

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🌺 Flower Market инициализирован');
    
    // Инициализация Telegram WebApp
    if (tg) {
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();
        
        console.log('✅ Telegram WebApp готов');
        console.log('Пользователь:', tg.initDataUnsafe?.user);
    }
    
    // Настройка обработчиков
    setupEventListeners();
    
    // Показываем первый шаг
    showStep(1);
});

// ============================================
// ОБРАБОТКА ШАГОВ
// ============================================

function showStep(step) {
    // Скрываем все шаги
    document.querySelectorAll('.form-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Показываем нужный шаг
    const stepEl = document.getElementById(`step${step}`);
    if (stepEl) {
        stepEl.classList.add('active');
    }
    
    currentStep = step;
    updateProgressBar();
    validateCurrentStep();
}

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = step.querySelector('.step-number');
        const stepLabel = step.querySelector('.step-label');
        
        if (stepNumber && stepLabel) {
            if (index + 1 <= currentStep) {
                stepNumber.classList.add('active');
                stepLabel.classList.add('active');
            } else {
                stepNumber.classList.remove('active');
                stepLabel.classList.remove('active');
            }
        }
    });
}

// ============================================
// ВАЛИДАЦИЯ
// ============================================

function validateCurrentStep() {
    let isValid = true;
    
    switch (currentStep) {
        case 1:
            isValid = mediaFiles.length > 0;
            break;
            
        case 2:
            const desc = document.getElementById('description')?.value || '';
            isValid = desc.trim().length >= 3;
            break;
            
        case 3:
            const price = document.getElementById('price')?.value || '';
            const isNegotiable = document.getElementById('priceBtnNegotiable')?.classList.contains('active');
            isValid = isNegotiable || (!isNaN(parseFloat(price)) && parseFloat(price) > 0);
            break;
            
        case 4:
            if (selectedContactType === 'telegram') {
                const telegram = document.getElementById('telegram')?.value || '';
                isValid = telegram.length >= 3;
            } else if (selectedContactType === 'phone') {
                const phone = document.getElementById('phone')?.value || '';
                isValid = phone.length >= 10;
            }
            break;
            
        case 5:
            const region = document.getElementById('regionSelect')?.value || '';
            const city = document.getElementById('citySelect')?.value || '';
            isValid = region && city;
            break;
    }
    
    // Обновляем кнопку "Далее"
    const nextBtn = document.getElementById(`nextBtn${currentStep}`);
    if (nextBtn) {
        nextBtn.disabled = !isValid;
    }
    
    return isValid;
}

// ============================================
// ЗАГРУЗКА ФОТО
// ============================================

function handleMediaUpload(event) {
    const files = Array.from(event.target.files);
    
    // Ограничение: максимум 10 файлов
    if (mediaFiles.length + files.length > 10) {
        showNotification('Ошибка', 'Максимум 10 фотографий', 'error');
        return;
    }
    
    // Добавляем файлы
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            mediaFiles.push({
                file: file,
                url: url,
                name: file.name,
                type: file.type
            });
        }
    });
    
    // Обновляем превью
    updateMediaPreview();
    
    // Валидируем шаг
    validateCurrentStep();
    
    // Очищаем input
    event.target.value = '';
}

function updateMediaPreview() {
    const preview = document.getElementById('mediaPreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    mediaFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'media-item';
        
        item.innerHTML = `
            <img src="${file.url}" alt="Фото ${index + 1}">
            <div class="media-type">ФОТО</div>
            <div class="remove-media" onclick="removeMedia(${index})">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        preview.appendChild(item);
    });
    
    // Обновляем подсказку
    const hint = document.getElementById('mediaHint');
    if (hint) {
        hint.textContent = mediaFiles.length > 0 
            ? `Загружено: ${mediaFiles.length} фото` 
            : 'Загрузите хотя бы одно фото';
        hint.classList.toggle('show', mediaFiles.length === 0);
    }
}

function removeMedia(index) {
    if (index >= 0 && index < mediaFiles.length) {
        URL.revokeObjectURL(mediaFiles[index].url);
        mediaFiles.splice(index, 1);
        updateMediaPreview();
        validateCurrentStep();
    }
}

// ============================================
// ПУБЛИКАЦИЯ ОБЪЯВЛЕНИЯ
// ============================================

async function submitForm() {
    try {
        // Собираем данные
        const formData = {
            initData: tg?.initData || '',
            description: document.getElementById('description').value,
            price: document.getElementById('price').value || 'Договорная',
            contacts: getContactInfo(),
            region: document.getElementById('regionSelect').value,
            city: document.getElementById('citySelect').value,
            address: document.getElementById('addressInput').value,
            mediaFiles: mediaFiles.map(f => ({
                name: f.name,
                type: f.type,
                size: f.file.size
            }))
        };
        
        // Показываем загрузку
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loader"></div> Публикация...';
        submitBtn.disabled = true;
        
        // Отправляем на сервер
        const response = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Показываем успех
            showSuccessScreen(result.postLink);
        } else {
            throw new Error(result.error || 'Ошибка публикации');
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка', error.message, 'error');
        
        // Восстанавливаем кнопку
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.innerHTML = 'Опубликовать <i class="fas fa-paper-plane"></i>';
            submitBtn.disabled = false;
        }
    }
}

function getContactInfo() {
    if (selectedContactType === 'telegram') {
        const telegram = document.getElementById('telegram')?.value || '';
        return `Telegram: ${telegram}`;
    } else if (selectedContactType === 'phone') {
        const phone = document.getElementById('phone')?.value || '';
        return `Телефон: ${phone}`;
    } else {
        return 'Контакты в комментариях';
    }
}

// ============================================
// УВЕДОМЛЕНИЯ И УТИЛИТЫ
// ============================================

function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    
    if (!notification || !titleEl || !messageEl) return;
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

function showSuccessScreen(postLink) {
    // Скрываем форму
    document.getElementById('formContainer').style.display = 'none';
    
    // Показываем экран успеха
    const successScreen = document.getElementById('successScreen');
    successScreen.style.display = 'block';
    
    // Обновляем ссылку
    const linkElement = document.getElementById('postLink');
    if (linkElement && postLink) {
        linkElement.href = postLink;
    }
    
    // Обновляем текст о комментариях
    const successMessage = document.querySelector('.success-message');
    if (successMessage) {
        successMessage.innerHTML = `
            ✅ <b>Объявление опубликовано!</b><br><br>
            💬 <b>Комментарии автоматически включены</b><br>
            Покупатели могут задавать вопросы прямо под вашим объявлением в разделе комментариев.
        `;
    }
}

// ============================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ (для onclick)
// ============================================

// Навигация
window.nextStep = function() {
    if (currentStep < 6 && validateCurrentStep()) {
        showStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // На последнем шаге обновляем превью
        if (currentStep === 6) {
            updatePreview();
        }
    }
};

window.prevStep = function() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// Цена
window.setNegotiablePrice = function() {
    const priceInput = document.getElementById('price');
    const negotiableBtn = document.getElementById('priceBtnNegotiable');
    const enterBtn = document.getElementById('priceBtnEnter');
    
    if (priceInput) priceInput.value = 'Договорная';
    if (negotiableBtn) negotiableBtn.classList.add('active');
    if (enterBtn) enterBtn.classList.remove('active');
    
    validateCurrentStep();
};

window.focusPriceInput = function() {
    const priceInput = document.getElementById('price');
    const negotiableBtn = document.getElementById('priceBtnNegotiable');
    const enterBtn = document.getElementById('priceBtnEnter');
    
    if (priceInput) {
        priceInput.value = '';
        priceInput.readOnly = false;
        priceInput.focus();
    }
    if (negotiableBtn) negotiableBtn.classList.remove('active');
    if (enterBtn) enterBtn.classList.add('active');
};

// Контакты
window.selectContactType = function(type) {
    selectedContactType = type;
    
    // UI
    document.querySelectorAll('.contact-option').forEach(opt => {
        opt.classList.remove('active');
    });
    document.getElementById(`${type}Option`)?.classList.add('active');
    
    // Поля
    document.getElementById('telegramInputGroup').style.display = 
        type === 'telegram' ? 'block' : 'none';
    document.getElementById('phoneInputGroup').style.display = 
        type === 'phone' ? 'block' : 'none';
    
    validateCurrentStep();
};

// Локация
window.loadCities = async function(region) {
    const citySelect = document.getElementById('citySelect');
    if (!citySelect || !region) return;
    
    try {
        const response = await fetch(`/api/cities/${encodeURIComponent(region)}`);
        const data = await response.json();
        
        citySelect.innerHTML = '<option value="">Выберите город</option>';
        
        if (data.cities && data.cities.length > 0) {
            data.cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
        
        validateCurrentStep();
    } catch (error) {
        console.error('Ошибка загрузки городов:', error);
    }
};

// Превью
function updatePreview() {
    // Фото
    const previewMedia = document.getElementById('previewMedia');
    if (previewMedia) {
        previewMedia.innerHTML = '';
        mediaFiles.slice(0, 3).forEach(file => {
            const img = document.createElement('img');
            img.className = 'photo-preview';
            img.src = file.url;
            previewMedia.appendChild(img);
        });
        
        if (mediaFiles.length > 3) {
            const more = document.createElement('div');
            more.className = 'photo-preview photo-more';
            more.textContent = `+${mediaFiles.length - 3}`;
            previewMedia.appendChild(more);
        }
    }
    
    // Описание
    const previewDesc = document.getElementById('previewDescription');
    if (previewDesc) {
        previewDesc.textContent = document.getElementById('description')?.value || '';
    }
    
    // Цена
    const previewPrice = document.getElementById('previewPrice');
    if (previewPrice) {
        previewPrice.textContent = document.getElementById('price')?.value || 'Договорная';
    }
    
    // Контакты
    const previewContacts = document.getElementById('previewContacts');
    if (previewContacts) {
        previewContacts.textContent = getContactInfo();
    }
    
    // Локация
    const previewLocation = document.getElementById('previewLocation');
    if (previewLocation) {
        const region = document.getElementById('regionSelect')?.value;
        const city = document.getElementById('citySelect')?.value;
        const address = document.getElementById('addressInput')?.value;
        
        let locationText = '';
        if (region) locationText += region;
        if (city) locationText += `, ${city}`;
        if (address) locationText += ` (${address})`;
        
        previewLocation.textContent = locationText;
    }
}

// Другие функции
window.createNewAd = function() {
    location.reload(); // Простой способ сбросить форму
};

window.closeTelegramApp = function() {
    if (tg) {
        tg.close();
    }
};

// ============================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ============================================

function setupEventListeners() {
    // Загрузка медиа
    const mediaInput = document.getElementById('mediaInput');
    const mediaUpload = document.getElementById('mediaUpload');
    
    if (mediaInput && mediaUpload) {
        mediaUpload.addEventListener('click', () => mediaInput.click());
        mediaInput.addEventListener('change', handleMediaUpload);
    }
    
    // Валидация при вводе
    const fieldsToValidate = ['description', 'telegram', 'phone', 'addressInput'];
    fieldsTo.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => validateCurrentStep());
        }
    });
    
    // Регион
    const regionSelect = document.getElementById('regionSelect');
    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            loadCities(this.value);
        });
    }
    
    // Карта (базовая реализация)
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            showNotification('Информация', 'Определяем местоположение...', 'info');
            // Здесь будет геолокация
        });
    }
    
    // Telegram геолокация
    const telegramLocationBtn = document.getElementById('telegramLocationBtn');
    if (telegramLocationBtn && tg) {
        telegramLocationBtn.addEventListener('click', () => {
            tg.showPopup({
                title: 'Геолокация',
                message: 'Разрешить доступ к вашему местоположению?',
                buttons: [
                    { type: 'ok', text: 'Разрешить' },
                    { type: 'cancel', text: 'Отмена' }
                ]
            });
        });
    }
}

// Инициализация
console.log('🌺 Flower Market готов к работе!');