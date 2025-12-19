// Основные переменные
let formData = {
    photos: [],
    videos: [],
    description: '',
    price: 'Договорная',
    contact_type: 'telegram',
    contacts: '',
    location: { 
        region: '',
        city: '',
        address: '',
        coordinates: null 
    }
};
let currentStep = 1;
const totalSteps = 6;
const MAX_MEDIA = 10;

let tg = null;
let isTelegram = false;
let map = null;
let marker = null;
let initialTelegramUsername = '';

// Данные по регионам и городам Кыргызстана
const kyrgyzstanRegions = {
    'Бишкек': ['Бишкек (все районы)', 'Аламединский район', 'Ленинский район', 'Октябрьский район', 'Первомайский район', 'Свердловский район'],
    'Ош': ['Ош (все районы)', 'Араванский район', 'Кара-Сууйский район', 'Ноокатский район'],
    'Чуйская': ['Токмок', 'Кара-Балта', 'Кант', 'Шопоков', 'Каинды', 'Каракол (Чуйская)', 'Сокулук', 'Иссык-Атинский район', 'Жайылский район', 'Кеминский район', 'Московский район', 'Панфиловский район', 'Сокулукский район', 'Чуйский район', 'Аламедин', 'Орто-Сай', 'Чон-Арык'],
    'Ошская': ['Ош (город)', 'Араван', 'Кара-Суу', 'Ноокат', 'Узген', 'Гулча', 'Дараут-Курган', 'Кызыл-Кия'],
    'Джалал-Абадская': ['Джалал-Абад', 'Кара-Куль', 'Кок-Жангак', 'Майлуу-Суу', 'Таш-Кумыр', 'Сузак', 'Базар-Коргон', 'Ноокен', 'Аксый', 'Ала-Бука', 'Чаткал', 'Токтогул'],
    'Иссык-Кульская': ['Каракол', 'Балыкчы', 'Чолпон-Ата', 'Тамга', 'Тюп', 'Ананьево', 'Каджи-Сай', 'Бостери', 'Ак-Суу', 'Джети-Огуз', 'Тон', 'Ысык-Куль'],
    'Нарынская': ['Нарын', 'Ат-Баши', 'Кочкор', 'Казарман', 'Чаек', 'Ак-Талаа', 'Жумгал', 'Кочкорка'],
    'Таласская': ['Талас', 'Кара-Буура', 'Манас', 'Бакай-Ата', 'Кызыл-Адыр'],
    'Баткенская': ['Баткен', 'Кызыл-Кия', 'Сульфа', 'Исфана', 'Кадамжай', 'Лейлек', 'Айдаркен']
};

// ВАЖНО: Используем относительный путь для текущего домена
const SERVER_URL = '';

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация...');
    
    // Инициализация Telegram
    checkTelegram();
    
    // Инициализация кнопок
    initButtons();
    
    // Инициализация полей
    initFields();
    
    // Инициализация лепестков
    initPetals();
    
    // Проверка доступности сервера
    checkBackend();
});

// ==================== ЗАГРУЗКА МЕДИА ====================

function initMediaUpload() {
    const mediaUpload = document.getElementById('mediaUpload');
    const mediaInput = document.getElementById('mediaInput');
    
    if (!mediaUpload || !mediaInput) {
        console.error('Элементы загрузки медиа не найдены');
        return;
    }
    
    // Теперь mediaUpload - это label, который связан с input через for="mediaInput"
    // Не нужно добавлять обработчик клика вручную
    
    // Обработчик выбора файлов
    mediaInput.addEventListener('change', function(e) {
        console.log('Выбраны файлы:', e.target.files.length);
        if (e.target.files.length > 0) {
            handleMediaFiles(e.target.files);
        }
        
        // Сброс значения input, чтобы можно было снова выбрать те же файлы
        this.value = '';
    });
    
    // Добавляем стили для курсора
    mediaUpload.style.cursor = 'pointer';
    
    // Обновляем начальное состояние
    updateMediaCounter();
    checkStep1Fields();
}

// Обработка медиафайлов
function handleMediaFiles(files) {
    console.log('Обработка файлов:', files.length);
    
    // Проверка на максимальное количество файлов
    const currentCount = formData.photos.length + formData.videos.length;
    if (currentCount + files.length > MAX_MEDIA) {
        showNotification('Ошибка', `Максимум можно загрузить ${MAX_MEDIA} файлов`, 'error');
        return;
    }
    
    // Показываем прогресс
    const fileProgress = document.getElementById('fileProgress');
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    
    if (fileProgress && progressBar && progressText) {
        fileProgress.style.display = 'flex';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
    }
    
    let processed = 0;
    const total = files.length;
    
    // Обрабатываем каждый файл
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const result = e.target.result;
            
            if (file.type.startsWith('image/')) {
                formData.photos.push(result);
                createMediaPreview(result, 'photo', formData.photos.length - 1);
            } else if (file.type.startsWith('video/')) {
                formData.videos.push(result);
                createMediaPreview(result, 'video', formData.videos.length - 1);
            }
            
            processed++;
            
            // Обновляем прогресс
            if (progressBar && progressText) {
                const progress = Math.round((processed / total) * 100);
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
            }
            
            // Если все файлы обработаны
            if (processed === total) {
                setTimeout(() => {
                    if (fileProgress) {
                        fileProgress.style.display = 'none';
                    }
                    updateMediaCounter();
                    checkStep1Fields();
                }, 500);
            }
        };
        
        reader.onerror = function() {
            console.error('Ошибка чтения файла:', file.name);
            processed++;
            
            if (processed === total) {
                setTimeout(() => {
                    if (fileProgress) {
                        fileProgress.style.display = 'none';
                    }
                    updateMediaCounter();
                    checkStep1Fields();
                }, 500);
            }
        };
        
        reader.readAsDataURL(file);
    });
}

// Создание превью медиа
function createMediaPreview(src, type, index) {
    const preview = document.getElementById('mediaPreview');
    if (!preview) return;
    
    const div = document.createElement('div');
    div.className = 'media-item';
    
    const typeBadge = document.createElement('div');
    typeBadge.className = 'media-type';
    typeBadge.textContent = type === 'photo' ? 'ФОТО' : 'ВИДЕО';
    
    if (type === 'photo') {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Фото ${index + 1}`;
        div.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = src;
        video.controls = true;
        video.muted = true;
        div.appendChild(video);
    }
    
    const removeBtn = document.createElement('div');
    removeBtn.className = 'remove-media';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = function() {
        removeMedia(type, index);
    };
    
    div.appendChild(typeBadge);
    div.appendChild(removeBtn);
    preview.appendChild(div);
}

// Удаление медиа
function removeMedia(type, index) {
    if (type === 'photo') {
        formData.photos.splice(index, 1);
    } else {
        formData.videos.splice(index, 1);
    }
    
    // Обновляем превью
    const preview = document.getElementById('mediaPreview');
    if (preview) {
        preview.innerHTML = '';
        
        formData.photos.forEach((photo, i) => {
            createMediaPreview(photo, 'photo', i);
        });
        
        formData.videos.forEach((video, i) => {
            createMediaPreview(video, 'video', i);
        });
    }
    
    updateMediaCounter();
    checkStep1Fields();
}

// Обновление счетчика медиа
function updateMediaCounter() {
    const upload = document.getElementById('mediaUpload');
    if (!upload) return;
    
    const totalCount = formData.photos.length + formData.videos.length;
    const photoCount = formData.photos.length;
    const videoCount = formData.videos.length;
    
    const icon = upload.querySelector('.photo-upload-icon');
    const paragraphs = upload.querySelectorAll('p');
    
    if (totalCount > 0) {
        if (icon) {
            icon.className = 'fas fa-check-circle photo-upload-icon';
            icon.style.color = '#34c759';
        }
        
        if (paragraphs.length >= 2) {
            paragraphs[0].textContent = `Загружено: ${photoCount} фото, ${videoCount} видео`;
            paragraphs[1].textContent = `Можно добавить ещё ${MAX_MEDIA - totalCount} файлов`;
        }
    } else {
        if (icon) {
            icon.className = 'fas fa-cloud-upload-alt photo-upload-icon';
            icon.style.color = '';
        }
        
        if (paragraphs.length >= 2) {
            paragraphs[0].textContent = 'Нажмите для загрузки фото и видео';
            paragraphs[1].textContent = `Выберите фото или видео из галереи. Можно загрузить до ${MAX_MEDIA} файлов`;
        }
    }
}

// ==================== НАВИГАЦИЯ ====================

function showStep(step) {
    // Скрываем все шаги
    for (let i = 1; i <= totalSteps; i++) {
        const stepElement = document.getElementById(`step${i}`);
        if (stepElement) {
            stepElement.classList.remove('active');
        }
    }
    
    // Показываем текущий шаг
    const currentStepElement = document.getElementById(`step${step}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    currentStep = step;
    updateProgressBar();
    
    // Инициализация для каждого шага
    if (step === 2) {
        setTimeout(checkStep2Fields, 100);
    } else if (step === 3) {
        setTimeout(checkStep3Fields, 100);
    } else if (step === 4) {
        setTimeout(checkStep4Fields, 100);
    } else if (step === 5) {
        setTimeout(checkStep5Fields, 100);
    } else if (step === 6) {
        updatePreview();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
    if (!validateStep(currentStep)) {
        return;
    }
    
    saveCurrentStepData();
    
    if (currentStep < totalSteps) {
        showStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

function validateStep(step) {
    if (step === 1) {
        if (formData.photos.length + formData.videos.length === 0) {
            showNotification('Ошибка', 'Загрузите хотя бы одно фото или видео', 'error');
            return false;
        }
        return true;
    }
    
    if (step === 2) {
        const description = document.getElementById('description');
        if (!description || description.value.trim().length < 3) {
            showNotification('Ошибка', 'Описание должно содержать минимум 3 символа', 'error');
            return false;
        }
        return true;
    }
    
    if (step === 3) {
        const price = document.getElementById('price');
        if (!price || price.value.trim().length < 1) {
            showNotification('Ошибка', 'Укажите цену или выберите "Договорная"', 'error');
            return false;
        }
        
        if (price.value !== 'Договорная') {
            const priceRegex = /^[0-9\-]+$/;
            if (!priceRegex.test(price.value)) {
                showNotification('Ошибка', 'Цена должна содержать только цифры и дефис', 'error');
                return false;
            }
        }
        return true;
    }
    
    if (step === 4) {
        if (!checkStep4Fields()) {
            showNotification('Ошибка', 'Заполните контактные данные', 'error');
            return false;
        }
        return true;
    }
    
    if (step === 5) {
        const region = document.getElementById('regionSelect');
        const city = document.getElementById('citySelect');
        
        if (!region || !region.value) {
            showNotification('Ошибка', 'Выберите регион', 'error');
            return false;
        }
        
        if (!city || !city.value) {
            showNotification('Ошибка', 'Выберите город или район', 'error');
            return false;
        }
        
        return true;
    }
    
    return true;
}

function saveCurrentStepData() {
    if (currentStep === 2) {
        const description = document.getElementById('description');
        if (description) {
            formData.description = description.value.trim();
        }
    } else if (currentStep === 3) {
        const price = document.getElementById('price');
        if (price) {
            formData.price = price.value.trim();
        }
    } else if (currentStep === 4) {
        if (formData.contact_type === 'telegram') {
            const telegram = document.getElementById('telegram');
            if (telegram) {
                let t = telegram.value.trim();
                if (t && !t.startsWith('@')) {
                    t = '@' + t;
                }
                formData.contacts = t;
            }
        } else if (formData.contact_type === 'phone') {
            const phone = document.getElementById('phone');
            if (phone) {
                formData.contacts = phone.value.trim();
            }
        } else {
            formData.contacts = '';
        }
    } else if (currentStep === 5) {
        const region = document.getElementById('regionSelect');
        const city = document.getElementById('citySelect');
        const address = document.getElementById('addressInput');
        
        if (region) formData.location.region = region.value;
        if (city) formData.location.city = city.value;
        if (address) formData.location.address = address.value.trim();
    }
}

// ==================== ПРОВЕРКА ПОЛЕЙ ====================

function checkStep1Fields() {
    const mediaCount = formData.photos.length + formData.videos.length;
    const nextBtn = document.getElementById('nextBtn1');
    const mediaHint = document.getElementById('mediaHint');
    
    if (nextBtn) {
        nextBtn.disabled = mediaCount === 0;
    }
    
    if (mediaHint) {
        mediaHint.style.display = mediaCount === 0 ? 'block' : 'none';
    }
}

function checkStep2Fields() {
    const description = document.getElementById('description');
    const nextBtn = document.getElementById('nextBtn2');
    const descriptionHint = document.getElementById('descriptionHint');
    
    if (!description || !nextBtn || !descriptionHint) return;
    
    const value = description.value.trim();
    const isValid = value.length >= 3;
    
    nextBtn.disabled = !isValid;
    descriptionHint.style.display = isValid ? 'none' : 'block';
}

function checkStep3Fields() {
    const price = document.getElementById('price');
    const nextBtn = document.getElementById('nextBtn3');
    const priceHint = document.getElementById('priceHint');
    
    if (!price || !nextBtn || !priceHint) return;
    
    const value = price.value.trim();
    let isValid = false;
    
    if (value === 'Договорная') {
        isValid = true;
    } else {
        const priceRegex = /^[0-9\-]+$/;
        isValid = value.length >= 1 && priceRegex.test(value);
    }
    
    nextBtn.disabled = !isValid;
    priceHint.style.display = isValid ? 'none' : 'block';
}

function checkStep4Fields() {
    const contactType = formData.contact_type;
    const nextBtn = document.getElementById('nextBtn4');
    
    if (!nextBtn) return false;
    
    let isValid = false;
    
    if (contactType === 'none') {
        isValid = true;
    } else if (contactType === 'telegram') {
        const telegram = document.getElementById('telegram');
        const telegramHint = document.getElementById('telegramHint');
        
        if (telegram && telegramHint) {
            const value = telegram.value.trim();
            const telegramRegex = /^@?[a-zA-Z0-9_]{5,}$/;
            isValid = value.length > 0 && telegramRegex.test(value);
            telegramHint.style.display = isValid ? 'none' : 'block';
            
            const phoneHint = document.getElementById('phoneHint');
            if (phoneHint) phoneHint.style.display = 'none';
        }
    } else {
        const phone = document.getElementById('phone');
        const phoneHint = document.getElementById('phoneHint');
        
        if (phone && phoneHint) {
            const value = phone.value.trim();
            isValid = value.length === 13 && value.startsWith('+996');
            phoneHint.style.display = isValid ? 'none' : 'block';
            
            const telegramHint = document.getElementById('telegramHint');
            if (telegramHint) telegramHint.style.display = 'none';
        }
    }
    
    nextBtn.disabled = !isValid;
    return isValid;
}

function checkStep5Fields() {
    const region = document.getElementById('regionSelect');
    const city = document.getElementById('citySelect');
    const nextBtn = document.getElementById('nextBtn5');
    const regionHint = document.getElementById('regionHint');
    const cityHint = document.getElementById('cityHint');
    
    if (!region || !city || !nextBtn || !regionHint || !cityHint) return;
    
    const regionValid = region.value && region.value.length > 0;
    const cityValid = city.value && city.value.length > 0;
    
    nextBtn.disabled = !(regionValid && cityValid);
    regionHint.style.display = regionValid ? 'none' : 'block';
    cityHint.style.display = cityValid ? 'none' : 'block';
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

function setNegotiablePrice() {
    const price = document.getElementById('price');
    const negotiableBtn = document.getElementById('priceBtnNegotiable');
    const enterBtn = document.getElementById('priceBtnEnter');
    
    if (price) {
        price.value = 'Договорная';
        price.readOnly = true;
    }
    
    if (negotiableBtn) negotiableBtn.classList.add('active');
    if (enterBtn) enterBtn.classList.remove('active');
    
    checkStep3Fields();
}

function focusPriceInput() {
    const price = document.getElementById('price');
    const negotiableBtn = document.getElementById('priceBtnNegotiable');
    const enterBtn = document.getElementById('priceBtnEnter');
    
    if (price) {
        price.value = '';
        price.readOnly = false;
        price.focus();
        price.placeholder = 'Только цифры (например: 1500 или 1000-1500)';
    }
    
    if (negotiableBtn) negotiableBtn.classList.remove('active');
    if (enterBtn) enterBtn.classList.add('active');
    
    checkStep3Fields();
}

function selectContactType(type) {
    formData.contact_type = type;
    
    const telegramOption = document.getElementById('telegramOption');
    const phoneOption = document.getElementById('phoneOption');
    const noContactOption = document.getElementById('noContactOption');
    const telegramInputGroup = document.getElementById('telegramInputGroup');
    const phoneInputGroup = document.getElementById('phoneInputGroup');
    
    if (telegramOption) telegramOption.classList.toggle('active', type === 'telegram');
    if (phoneOption) phoneOption.classList.toggle('active', type === 'phone');
    if (noContactOption) noContactOption.classList.toggle('active', type === 'none');
    
    if (telegramInputGroup) {
        telegramInputGroup.style.display = type === 'telegram' ? 'block' : 'none';
    }
    
    if (phoneInputGroup) {
        phoneInputGroup.style.display = type === 'phone' ? 'block' : 'none';
    }
    
    if (type === 'telegram') {
        const telegram = document.getElementById('telegram');
        if (telegram && !telegram.value.trim() && initialTelegramUsername) {
            telegram.value = initialTelegramUsername;
            formData.contacts = initialTelegramUsername;
        }
    } else if (type === 'phone') {
        const phone = document.getElementById('phone');
        if (phone && !phone.value.trim()) {
            phone.value = '+996';
            formData.contacts = '+996';
        }
    }
    
    checkStep4Fields();
}

function updateCities() {
    const regionSelect = document.getElementById('regionSelect');
    const citySelect = document.getElementById('citySelect');
    
    if (!regionSelect || !citySelect) return;
    
    const selectedRegion = regionSelect.value;
    
    citySelect.innerHTML = '<option value="">Выберите город/район</option>';
    
    if (selectedRegion && kyrgyzstanRegions[selectedRegion]) {
        kyrgyzstanRegions[selectedRegion].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
        
        formData.location.region = selectedRegion;
    } else {
        formData.location.region = '';
        formData.location.city = '';
    }
}

function updatePreview() {
    const previewMedia = document.getElementById('previewMedia');
    const previewDescription = document.getElementById('previewDescription');
    const previewPrice = document.getElementById('previewPrice');
    const previewContacts = document.getElementById('previewContacts');
    const previewLocation = document.getElementById('previewLocation');
    
    if (!previewMedia || !previewDescription || !previewPrice || !previewContacts || !previewLocation) return;
    
    // Медиа
    previewMedia.innerHTML = '';
    const allMedia = [...formData.photos.map(p => ({type: 'photo', src: p})), 
                      ...formData.videos.map(v => ({type: 'video', src: v}))];
    
    allMedia.slice(0, 6).forEach(media => {
        if (media.type === 'photo') {
            const img = document.createElement('img');
            img.className = 'photo-preview';
            img.src = media.src;
            previewMedia.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.className = 'photo-preview';
            video.src = media.src;
            video.controls = true;
            video.muted = true;
            previewMedia.appendChild(video);
        }
    });
    
    if (allMedia.length > 6) {
        const more = document.createElement('div');
        more.className = 'photo-preview photo-more';
        more.textContent = '+' + (allMedia.length - 6);
        previewMedia.appendChild(more);
    }
    
    // Описание
    previewDescription.textContent = formData.description || 'Не указано';
    
    // Цена
    previewPrice.textContent = formData.price || 'Не указана';
    
    // Контакты
    if (formData.contact_type === 'telegram') {
        const username = (formData.contacts || '').replace(/^@/, '');
        previewContacts.innerHTML = username ? `<a href="https://t.me/${username}" target="_blank">@${username}</a>` : 'Не указано';
    } else if (formData.contact_type === 'phone') {
        const phone = (formData.contacts || '').replace(/[^\d+]/g, '');
        previewContacts.innerHTML = phone ? `<a href="https://wa.me/${phone}" target="_blank">WhatsApp</a> • <a href="tel:${phone}">Позвонить</a>` : 'Не указано';
    } else {
        previewContacts.innerHTML = 'Не указаны';
    }
    
    // Локация
    let locationText = '';
    if (formData.location.region) locationText += formData.location.region;
    if (formData.location.city) locationText += (locationText ? ', ' : '') + formData.location.city;
    if (formData.location.address) locationText += (locationText ? ', ' : '') + formData.location.address;
    if (!locationText) locationText = '📍 Не указана';
    
    previewLocation.textContent = locationText;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function checkTelegram() {
    if (window.Telegram && Telegram.WebApp) {
        try {
            tg = Telegram.WebApp;
            isTelegram = true;
            
            if (tg.expand) tg.expand();
            if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
            
            if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.username) {
                const username = tg.initDataUnsafe.user.username;
                initialTelegramUsername = username.startsWith('@') ? username : '@' + username;
                
                const telegramField = document.getElementById('telegram');
                if (telegramField) {
                    telegramField.value = initialTelegramUsername;
                    formData.contact_type = 'telegram';
                    formData.contacts = initialTelegramUsername;
                    selectContactType('telegram');
                }
            }
            
            const telegramCloseSection = document.getElementById('telegramCloseSection');
            if (telegramCloseSection) {
                telegramCloseSection.style.display = 'block';
            }
        } catch (e) {
            console.error('Ошибка Telegram Web App:', e);
        }
    }
}

function initButtons() {
    // Инициализация кнопок навигации (уже есть в HTML)
    // Добавьте здесь другие инициализации кнопок, если необходимо
}

function initFields() {
    // Установка начальной цены
    const priceInput = document.getElementById('price');
    if (priceInput) {
        priceInput.value = 'Договорная';
        priceInput.readOnly = true;
    }
    
    // Инициализация медиа загрузки (ВАЖНО!)
    initMediaUpload();
    
    // Обработчики событий
    const descriptionInput = document.getElementById('description');
    if (descriptionInput) {
        descriptionInput.addEventListener('input', checkStep2Fields);
    }
    
    const priceField = document.getElementById('price');
    if (priceField) {
        priceField.addEventListener('input', checkStep3Fields);
    }
    
    const telegramField = document.getElementById('telegram');
    if (telegramField) {
        telegramField.addEventListener('input', checkStep4Fields);
    }
    
    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('input', checkStep4Fields);
    }
    
    const regionSelect = document.getElementById('regionSelect');
    if (regionSelect) {
        regionSelect.addEventListener('change', updateCities);
        regionSelect.addEventListener('change', checkStep5Fields);
    }
    
    const citySelect = document.getElementById('citySelect');
    if (citySelect) {
        citySelect.addEventListener('change', checkStep5Fields);
    }
    
    const addressInput = document.getElementById('addressInput');
    if (addressInput) {
        addressInput.addEventListener('input', checkStep5Fields);
    }
    
    // Инициализация счетчика медиа
    updateMediaCounter();
    checkStep1Fields();
}

function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notificationTitle');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (!notification || !notificationTitle || !notificationMessage) return;
    
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    notification.className = 'notification';
    if (type === 'success') {
        notification.classList.add('success');
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function updateProgressBar() {
    const stepNumbers = document.querySelectorAll('.step-number');
    const stepLabels = document.querySelectorAll('.step-label');
    
    stepNumbers.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === currentStep);
    });
    
    stepLabels.forEach((label, index) => {
        label.classList.toggle('active', index + 1 <= currentStep);
    });
}

function initPetals() {
    const layer = document.getElementById('petalLayer');
    if (!layer) return;
    
    const petals = ['🌸', '🌺', '🌼', '🌻'];
    
    function createPetal() {
        const petal = document.createElement('div');
        petal.className = 'petal';
        
        const size = 20 + Math.random() * 30;
        petal.style.fontSize = size + 'px';
        petal.style.left = Math.random() * 100 + '%';
        petal.style.opacity = 0.4 + Math.random() * 0.3;
        
        petal.textContent = petals[Math.floor(Math.random() * petals.length)];
        
        const duration = 10000 + Math.random() * 10000;
        petal.style.animation = `petalFall ${duration}ms linear forwards`;
        petal.style.animationDelay = Math.random() * 3000 + 'ms';
        
        layer.appendChild(petal);
        
        setTimeout(() => {
            if (petal.parentNode === layer) {
                layer.removeChild(petal);
            }
        }, duration + 3000);
    }
    
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createPetal(), i * 500);
    }
    
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            createPetal();
        }
    }, 1500);
}

function checkBackend() {
    // Используем относительный путь для текущего домена
    fetch('/health')
        .then(response => {
            if (response.ok) {
                console.log('✅ Сервер работает');
                return response.json();
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        })
        .then(data => {
            console.log('Информация сервера:', data);
            // Только тихое логирование, без уведомления
        })
        .catch(error => {
            console.warn('⚠️ Не удалось подключиться к серверу:', error.message);
            // Не показываем уведомление пользователю
        });
}

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================

window.nextStep = nextStep;
window.prevStep = prevStep;
window.setNegotiablePrice = setNegotiablePrice;
window.focusPriceInput = focusPriceInput;
window.selectContactType = selectContactType;
window.getTelegramLocation = getTelegramLocation;
window.getCurrentLocation = getCurrentLocation;
window.closeTelegramApp = closeTelegramApp;
window.createNewAd = createNewAd;

// ==================== ЗАГЛУШКИ ДЛЯ НЕРЕАЛИЗОВАННЫХ ФУНКЦИЙ ====================

function getTelegramLocation() {
    showNotification('Информация', 'Функция определения местоположения через Telegram временно недоступна', 'info');
}

function getCurrentLocation() {
    showNotification('Информация', 'Функция определения местоположения временно недоступна', 'info');
}

function closeTelegramApp() {
    if (window.Telegram && Telegram.WebApp) {
        try {
            const webApp = Telegram.WebApp;
            if (webApp.close) {
                webApp.close();
                return true;
            }
        } catch (e) {
            console.error('Error closing via Telegram.WebApp:', e);
        }
    }
    
    showNotification('Информация', 'Вы можете закрыть вкладку вручную', 'info');
    return false;
}

function createNewAd() {
    location.reload();
}

// ==================== ОСНОВНАЯ ФУНКЦИЯ ПУБЛИКАЦИИ ====================

async function submitForm() {
    console.log('Начало публикации...');
    
    saveCurrentStepData();
    
    // Валидация
    if (formData.photos.length + formData.videos.length === 0) {
        showNotification('Ошибка', 'Загрузите хотя бы одно фото или видео', 'error');
        showStep(1);
        return;
    }
    
    if (!formData.description || formData.description.length < 3) {
        showNotification('Ошибка', 'Описание должно содержать минимум 3 символа', 'error');
        showStep(2);
        return;
    }
    
    try {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loader"></div> Публикация...';
        }
        
        showNotification('Информация', 'Отправка объявления на сервер...', 'info');
        
        // Подготовка данных для отправки
        const postData = {
            photos: formData.photos.map(photo => ({ url: photo, type: 'photo' })),
            videos: formData.videos.map(video => ({ url: video, type: 'video' })),
            description: formData.description,
            price: formData.price,
            contact_type: formData.contact_type,
            contacts: formData.contacts,
            location: formData.location
        };
        
        console.log('Отправка данных на сервер:', {
            description: formData.description.substring(0, 50) + '...',
            price: formData.price,
            contact_type: formData.contact_type,
            contacts: formData.contacts ? 'указаны' : 'не указаны'
        });
        
        // Отправка на сервер
        const response = await fetch('/api/publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
        });
        
        const result = await response.json();
        console.log('Ответ сервера:', result);
        
        if (result.success) {
            // Успех!
            showNotification('Успех!', result.message, 'success');
            
            // Показываем ссылку на Telegram если есть
            if (result.telegram_link) {
                const postLink = document.getElementById('postLink');
                if (postLink) {
                    postLink.href = result.telegram_link;
                    postLink.textContent = 'Перейти к объявлению в Telegram';
                    document.getElementById('postLinkContainer').style.display = 'block';
                }
            }
            
            // Показываем экран успеха
            document.getElementById('formContainer').style.display = 'none';
            document.getElementById('successScreen').style.display = 'block';
            
        } else {
            // Ошибка от сервера
            showNotification('Ошибка', result.error || 'Не удалось опубликовать объявление', 'error');
            
            // Возвращаем кнопку в исходное состояние
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Опубликовать <i class="fas fa-paper-plane"></i>';
            }
        }
        
    } catch (error) {
        console.error('Ошибка при публикации:', error);
        showNotification('Ошибка', 'Не удалось подключиться к серверу. Попробуйте позже.', 'error');
        
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Опубликовать <i class="fas fa-paper-plane"></i>';
        }
    }
}

// Делаем функцию submitForm глобально доступной
window.submitForm = submitForm;

// ==================== ДЕМО-РЕЖИМ (если сервер не отвечает) ====================

function submitFormDemo() {
    saveCurrentStepData();
    
    // Валидация
    if (formData.photos.length + formData.videos.length === 0) {
        showNotification('Ошибка', 'Загрузите хотя бы одно фото или видео', 'error');
        showStep(1);
        return;
    }
    
    if (!formData.description || formData.description.length < 3) {
        showNotification('Ошибка', 'Описание должно содержать минимум 3 символа', 'error');
        showStep(2);
        return;
    }
    
    try {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loader"></div> Публикация...';
        }
        
        // В демо-режиме просто показываем экран успеха
        setTimeout(() => {
            showNotification('Демо-режим', 'Объявление создано (демо-режим)', 'info');
            
            // Показываем экран успеха
            document.getElementById('formContainer').style.display = 'none';
            document.getElementById('successScreen').style.display = 'block';
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Опубликовать <i class="fas fa-paper-plane"></i>';
            }
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка', 'Произошла ошибка', 'error');
        
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Опубликовать <i class="fas fa-paper-plane"></i>';
        }
    }
}

// Альтернативная функция для отладки
window.submitFormDemo = submitFormDemo;

// Проверяем, доступен ли сервер, и выбираем функцию
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем доступность сервера
    fetch('/health')
        .then(response => {
            if (response.ok) {
                console.log('✅ Используем реальный сервер');
                // Используем реальную функцию
                window.submitForm = submitForm;
            } else {
                throw new Error('Сервер не отвечает');
            }
        })
        .catch(error => {
            console.log('⚠️ Используем демо-режим');
            // Используем демо-функцию
            window.submitForm = submitFormDemo;
        });
});