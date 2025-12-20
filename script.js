// ============================================
// Flower Market Kyrgyzstan - Frontend
// Подключен к бэкенду: https://backend-flower-2-production.up.railway.app
// ============================================

// Конфигурация - ВАШ РАБОЧИЙ БЭКЕНД
const BACKEND_URL = 'https://backend-flower-2-production.up.railway.app';

// Глобальные переменные
let currentStep = 1;
let mediaFiles = [];
let selectedContactType = 'telegram';
let tg = window.Telegram?.WebApp;

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🌺 Flower Market Frontend запущен');
    console.log('Backend URL:', BACKEND_URL);
    
    // Инициализация Telegram WebApp
    if (tg) {
        tg.ready();
        tg.expand();
        
        console.log('✅ Telegram WebApp инициализирован');
        console.log('User:', tg.initDataUnsafe?.user);
        
        // Показываем кнопку закрытия для Telegram
        document.getElementById('telegramCloseSection').style.display = 'block';
    } else {
        console.log('⚠️ Запуск в браузере (не Telegram)');
        // Для тестирования в браузере
        window.tgMock = {
            initData: 'mock_data_for_testing',
            initDataUnsafe: { user: { id: 123456, first_name: 'Тест', username: 'test_user' } }
        };
        tg = window.tgMock;
    }
    
    // Настраиваем обработчики
    setupEventListeners();
    
    // Показываем первый шаг
    showStep(1);
    
    // Проверяем связь с бэкендом
    await checkBackendConnection();
});

// Проверка связи с бэкендом
async function checkBackendConnection() {
    try {
        console.log('🔗 Проверяю связь с бэкендом...');
        const response = await fetch(`${BACKEND_URL}/api/health`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Связь с бэкендом установлена:', data);
            showNotification('Готов к работе', 'Бэкенд подключен', 'success');
        } else {
            console.warn('⚠️ Бэкенд ответил с ошибкой:', data);
        }
    } catch (error) {
        console.error('❌ Ошибка связи с бэкендом:', error);
        showNotification('Внимание', 'Бэкенд временно недоступен', 'info');
    }
}

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ ФОРМЫ
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
        currentStep = step;
        updateProgressBar();
        validateCurrentStep();
    }
}

function updateProgressBar() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        const stepNumber = step.querySelector('.step-number');
        const stepLabel = step.querySelector('.step-label');
        
        if (stepNumber && stepLabel) {
            const isActive = index + 1 <= currentStep;
            stepNumber.classList.toggle('active', isActive);
            stepLabel.classList.toggle('active', isActive);
        }
    });
}

function validateCurrentStep() {
    let isValid = true;
    let errorMessage = '';
    
    switch (currentStep) {
        case 1:
            isValid = mediaFiles.length > 0;
            errorMessage = 'Загрузите хотя бы одно фото';
            break;
            
        case 2:
            const desc = document.getElementById('description')?.value.trim() || '';
            isValid = desc.length >= 3;
            errorMessage = 'Описание должно содержать минимум 3 символа';
            break;
            
        case 3:
            const priceInput = document.getElementById('price');
            const price = priceInput?.value || '';
            const isNegotiable = document.getElementById('priceBtnNegotiable')?.classList.contains('active');
            isValid = isNegotiable || (price && !isNaN(parseFloat(price)) && parseFloat(price) > 0);
            errorMessage = 'Укажите цену или выберите "Договорная"';
            break;
            
        case 4:
            if (selectedContactType === 'telegram') {
                const telegram = document.getElementById('telegram')?.value.trim() || '';
                isValid = telegram.length >= 3;
                errorMessage = 'Введите Telegram username';
            } else if (selectedContactType === 'phone') {
                const phone = document.getElementById('phone')?.value.trim() || '';
                isValid = phone.length >= 10;
                errorMessage = 'Введите номер телефона';
            }
            break;
            
        case 5:
            const region = document.getElementById('regionSelect')?.value || '';
            const city = document.getElementById('citySelect')?.value || '';
            isValid = region && city;
            errorMessage = 'Выберите регион и город';
            break;
    }
    
    // Обновляем кнопку "Далее"
    const nextBtn = document.getElementById(`nextBtn${currentStep}`);
    if (nextBtn) {
        nextBtn.disabled = !isValid;
    }
    
    // Показываем/скрываем ошибку
    const hintId = getHintIdForStep(currentStep);
    const hintElement = document.getElementById(hintId);
    if (hintElement) {
        if (!isValid) {
            hintElement.textContent = errorMessage;
            hintElement.classList.add('show');
        } else {
            hintElement.classList.remove('show');
        }
    }
    
    return isValid;
}

function getHintIdForStep(step) {
    const hints = {
        1: 'mediaHint',
        2: 'descriptionHint',
        3: 'priceHint',
        4: selectedContactType === 'telegram' ? 'telegramHint' : 'phoneHint',
        5: 'regionHint'
    };
    return hints[step];
}

// ============================================
// ОБРАБОТКА МЕДИА
// ============================================

function handleMediaUpload(event) {
    const files = Array.from(event.target.files);
    const maxFiles = 10; // Максимум 10 фото
    
    // Проверка лимита
    if (mediaFiles.length + files.length > maxFiles) {
        showNotification('Ошибка', `Можно загрузить не более ${maxFiles} фото`, 'error');
        return;
    }
    
    // Проверка типа файлов
    const validFiles = files.filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    });
    
    // Добавляем файлы
    validFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        mediaFiles.push({
            file: file,
            url: url,
            name: file.name,
            type: file.type,
            size: file.size
        });
    });
    
    updateMediaPreview();
    validateCurrentStep();
    event.target.value = '';
}

function updateMediaPreview() {
    const previewContainer = document.getElementById('mediaPreview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    mediaFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'media-item';
        
        item.innerHTML = `
            <img src="${file.url}" alt="Фото ${index + 1}" loading="lazy">
            <div class="media-type">${file.type.includes('image') ? 'ФОТО' : 'ФАЙЛ'}</div>
            <div class="remove-media" onclick="removeMedia(${index})">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        previewContainer.appendChild(item);
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
// API ВЗАИМОДЕЙСТВИЕ С БЭКЕНДОМ
// ============================================

async function getCities(region) {
    try {
        console.log(`Запрос городов для региона: ${region}`);
        const response = await fetch(`${BACKEND_URL}/api/cities/${encodeURIComponent(region)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Получены города:', data);
        
        return data.cities || [];
    } catch (error) {
        console.error('Ошибка получения городов:', error);
        showNotification('Ошибка', 'Не удалось загрузить города', 'error');
        return [];
    }
}

async function publishAd(formData) {
    try {
        console.log('📤 Отправка данных на бэкенд:', formData);
        
        const response = await fetch(`${BACKEND_URL}/api/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        console.log('📥 Ответ от бэкенда:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка публикации:', error);
        throw new Error(`Не удалось отправить данные: ${error.message}`);
    }
}

// ============================================
// ПУБЛИКАЦИЯ ОБЪЯВЛЕНИЯ
// ============================================

async function submitForm() {
    console.log('🚀 Начинаю публикацию...');
    
    // Проверяем все шаги
    for (let i = 1; i <= 5; i++) {
        if (!validateCurrentStep()) {
            showNotification('Ошибка', 'Заполните все обязательные поля', 'error');
            return;
        }
    }
    
    // Показываем шаг превью
    showStep(6);
    updatePreview();
    
    // Собираем данные
    const formData = {
        initData: tg?.initData || 'test_data', // Для тестирования
        description: document.getElementById('description').value,
        price: document.getElementById('price').value || 'Договорная',
        contacts: getContactInfo(),
        region: document.getElementById('regionSelect').value,
        city: document.getElementById('citySelect').value,
        address: document.getElementById('addressInput').value || '',
        photos: mediaFiles.map(f => f.url)
    };
    
    console.log('📝 Данные для публикации:', formData);
    
    // Показываем загрузку
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loader"></div> Публикация...';
    submitBtn.disabled = true;
    
    try {
        // Отправляем на бэкенд
        const result = await publishAd(formData);
        
        if (result.success) {
            // Успех!
            console.log('✅ Публикация успешна!', result);
            showSuccessScreen(result.postLink);
        } else {
            throw new Error(result.error || 'Неизвестная ошибка публикации');
        }
        
    } catch (error) {
        console.error('❌ Ошибка публикации:', error);
        showNotification('Ошибка публикации', error.message, 'error');
        
        // Восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function getContactInfo() {
    if (selectedContactType === 'telegram') {
        const telegram = document.getElementById('telegram').value.trim();
        return `Telegram: ${telegram.startsWith('@') ? telegram : '@' + telegram}`;
    } else if (selectedContactType === 'phone') {
        const phone = document.getElementById('phone').value.trim();
        return `Телефон: ${phone}`;
    } else {
        return 'Контакты в комментариях';
    }
}

function updatePreview() {
    // Фото
    const previewMedia = document.getElementById('previewMedia');
    if (previewMedia) {
        previewMedia.innerHTML = '';
        mediaFiles.slice(0, 3).forEach(file => {
            const img = document.createElement('img');
            img.className = 'photo-preview';
            img.src = file.url;
            img.alt = 'Фото объявления';
            previewMedia.appendChild(img);
        });
        
        if (mediaFiles.length > 3) {
            const more = document.createElement('div');
            more.className = 'photo-preview photo-more';
            more.textContent = `+${mediaFiles.length - 3}`;
            previewMedia.appendChild(more);
        }
    }
    
    // Остальные поля
    document.getElementById('previewDescription').textContent = 
        document.getElementById('description').value || 'Не указано';
    
    document.getElementById('previewPrice').textContent = 
        document.getElementById('price').value || 'Договорная';
    
    document.getElementById('previewContacts').textContent = getContactInfo();
    
    const region = document.getElementById('regionSelect').value || '';
    const city = document.getElementById('citySelect').value || '';
    const address = document.getElementById('addressInput').value || '';
    
    let locationText = '';
    if (region) locationText += region;
    if (city) locationText += `, ${city}`;
    if (address) locationText += ` (${address})`;
    
    document.getElementById('previewLocation').textContent = 
        locationText || 'Не указано';
}

// ============================================
// УТИЛИТЫ И УВЕДОМЛЕНИЯ
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
    if (linkElement) {
        linkElement.href = postLink || '#';
        linkElement.textContent = postLink 
            ? 'Перейти к объявлению с комментариями' 
            : 'Объявление опубликовано';
    }
    
    // Обновляем текст о комментариях
    const successMessage = document.querySelector('.success-message');
    if (successMessage) {
        successMessage.innerHTML = `
            ✅ <b>Объявление успешно опубликовано!</b><br><br>
            💬 <b>Комментарии автоматически включены</b><br>
            Покупатели могут задавать вопросы прямо под вашим объявлением в разделе комментариев.
        `;
    }
    
    // Прокрутка наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ (для onclick в HTML)
// ============================================

// Навигация
window.nextStep = function() {
    if (currentStep < 6 && validateCurrentStep()) {
        showStep(currentStep + 1);
    }
};

window.prevStep = function() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
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
        priceInput.placeholder = 'Например: 500';
    }
    if (negotiableBtn) negotiableBtn.classList.remove('active');
    if (enterBtn) enterBtn.classList.add('active');
};

// Контакты
window.selectContactType = function(type) {
    selectedContactType = type;
    
    // UI кнопок
    document.querySelectorAll('.contact-option').forEach(opt => {
        opt.classList.remove('active');
    });
    const optionElement = document.getElementById(`${type}Option`);
    if (optionElement) optionElement.classList.add('active');
    
    // Поля ввода
    const telegramGroup = document.getElementById('telegramInputGroup');
    const phoneGroup = document.getElementById('phoneInputGroup');
    
    if (telegramGroup) telegramGroup.style.display = type === 'telegram' ? 'block' : 'none';
    if (phoneGroup) phoneGroup.style.display = type === 'phone' ? 'block' : 'none';
    
    validateCurrentStep();
};

// Локация
window.loadCities = async function(region) {
    if (!region) return;
    
    const citySelect = document.getElementById('citySelect');
    if (!citySelect) return;
    
    const originalValue = citySelect.value;
    
    citySelect.innerHTML = '<option value="">Загрузка...</option>';
    citySelect.disabled = true;
    
    const cities = await getCities(region);
    
    citySelect.innerHTML = '<option value="">Выберите город/район</option>';
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
    
    // Восстанавливаем значение если оно есть в новом списке
    if (originalValue && cities.includes(originalValue)) {
        citySelect.value = originalValue;
    }
    
    citySelect.disabled = false;
    validateCurrentStep();
};

// Другие функции
window.createNewAd = function() {
    location.reload();
};

window.closeTelegramApp = function() {
    if (tg && tg.close) {
        tg.close();
    }
};

window.removeMedia = removeMedia;
window.submitForm = submitForm;

// ============================================
// НАСТРОЙКА ОБРАБОТЧИКОВ
// ============================================

function setupEventListeners() {
    // Загрузка медиа
    const mediaInput = document.getElementById('mediaInput');
    const mediaUpload = document.getElementById('mediaUpload');
    
    if (mediaInput && mediaUpload) {
        mediaUpload.addEventListener('click', () => mediaInput.click());
        mediaInput.addEventListener('change', handleMediaUpload);
    }
    
    // Автовалидация полей
    const fields = ['description', 'telegram', 'phone', 'addressInput', 'price'];
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => validateCurrentStep());
        }
    });
    
    // Регион
    const regionSelect = document.getElementById('regionSelect');
    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            if (this.value) {
                window.loadCities(this.value);
            }
        });
    }
}

console.log('✅ Flower Market Frontend готов к работе!');