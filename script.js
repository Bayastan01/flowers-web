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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB для фото
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB для видео

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

// ВАЖНО: Фиксированный URL бэкенда
const SERVER_URL = 'https://backend-flower-2-production.up.railway.app';

console.log('Backend URL:', SERVER_URL);

// Проверка Telegram Web App и автозаполнение username
function checkTelegram() {
    if (window.Telegram && Telegram.WebApp) {
        try {
            tg = Telegram.WebApp;
            isTelegram = true;
            
            // Раскрываем приложение на весь экран
            if (tg.expand) tg.expand();
            
            // Включаем подтверждение закрытия
            if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
            
            // Автозаполнение username из Telegram
            if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.username) {
                const username = tg.initDataUnsafe.user.username;
                initialTelegramUsername = username.startsWith('@') ? username : '@' + username;
                
                // Заполняем поле Telegram
                document.getElementById('telegram').value = initialTelegramUsername;
                formData.contact_type = 'telegram';
                formData.contacts = initialTelegramUsername;
                
                selectContactType('telegram');
                
                setTimeout(() => {
                    checkStep4Fields();
                }, 100);
            }
            
            // Показываем секцию для закрытия в Telegram
            document.getElementById('telegramCloseSection').style.display = 'block';
            
            console.log('Telegram Web App detected, user:', tg.initDataUnsafe?.user);
            return true;
        } catch (e) {
            console.error('Ошибка Telegram Web App:', e);
        }
    } else {
        console.log('Telegram Web App not detected - running in regular browser');
    }
    return false;
}

// Компрессия изображения
async function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        // Если файл маленький или не изображение, возвращаем как есть
        if (!file.type.startsWith('image/') || file.size < 500 * 1024) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
        }

        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
            // Рассчитываем новые размеры
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Рисуем сжатое изображение
            ctx.drawImage(img, 0, 0, width, height);
            
            // Конвертируем в base64 с заданным качеством
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// Обработка медиафайлов с прогрессом
async function handleMediaFiles(files) {
    if (formData.photos.length + formData.videos.length + files.length > MAX_MEDIA) {
        showNotification('Ошибка', `Максимум можно загрузить ${MAX_MEDIA} файлов`, 'error');
        return;
    }
    
    const progressBar = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    const fileProgress = document.getElementById('fileProgress');
    
    fileProgress.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
    let processedCount = 0;
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Проверка размера файла
        if (file.type.startsWith('image/') && file.size > MAX_FILE_SIZE) {
            showNotification('Ошибка', `Фото "${file.name}" слишком большое (максимум 10MB)`, 'error');
            continue;
        }
        
        if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
            showNotification('Ошибка', `Видео "${file.name}" слишком большое (максимум 20MB)`, 'error');
            continue;
        }
        
        try {
            if (file.type.startsWith('image/')) {
                // Сжимаем изображение
                const compressedImage = await compressImage(file);
                formData.photos.push(compressedImage);
                createMediaPreview(compressedImage, 'photo', formData.photos.length - 1);
            } else if (file.type.startsWith('video/')) {
                // Для видео просто читаем файл
                const reader = new FileReader();
                const videoData = await new Promise((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                formData.videos.push(videoData);
                createMediaPreview(videoData, 'video', formData.videos.length - 1);
            }
            
            processedCount++;
            
            // Обновляем прогресс
            const progress = Math.round((processedCount / totalFiles) * 100);
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            
        } catch (error) {
            console.error('Ошибка обработки файла:', error);
            showNotification('Ошибка', `Не удалось обработать файл "${file.name}"`, 'error');
        }
    }
    
    // Скрываем прогресс-бар после завершения
    setTimeout(() => {
        fileProgress.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
    }, 1000);
    
    updateMediaCounter();
    checkStep1Fields();
}

// Создание превью медиа
function createMediaPreview(src, type, index) {
    const preview = document.getElementById('mediaPreview');
    const div = document.createElement('div');
    div.className = 'media-item';
    div.setAttribute('data-type', type);
    div.setAttribute('data-index', index);
    
    const typeBadge = document.createElement('div');
    typeBadge.className = 'media-type';
    typeBadge.textContent = type === 'photo' ? 'ФОТО' : 'ВИДЕО';
    
    if (type === 'photo') {
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Фото ${index + 1}`;
        img.loading = 'lazy'; // Ленивая загрузка
        div.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = src;
        video.controls = true;
        video.muted = true;
        video.preload = 'metadata'; // Предзагрузка только метаданных
        div.appendChild(video);
    }
    
    const removeBtn = document.createElement('div');
    removeBtn.className = 'remove-media';
    removeBtn.innerText = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
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
    refreshMedia();
    updateMediaCounter();
    checkStep1Fields();
}

// Обновление превью
function refreshMedia() {
    const preview = document.getElementById('mediaPreview');
    preview.innerHTML = '';
    
    formData.photos.forEach((photo, index) => {
        createMediaPreview(photo, 'photo', index);
    });
    
    formData.videos.forEach((video, index) => {
        createMediaPreview(video, 'video', index);
    });
}

// Обновление счетчика медиа
function updateMediaCounter() {
    const upload = document.getElementById('mediaUpload');
    const totalCount = formData.photos.length + formData.videos.length;
    const photoCount = formData.photos.length;
    const videoCount = formData.videos.length;
    
    if (totalCount > 0) {
        upload.innerHTML = `
            <i class="fas fa-check-circle photo-upload-icon" style="color: #34c759"></i>
            <p>Загружено: ${photoCount} фото, ${videoCount} видео</p>
            <p class="input-hint">Можно добавить ещё ${MAX_MEDIA - totalCount} файлов</p>
        `;
    } else {
        upload.innerHTML = `
            <i class="fas fa-cloud-upload-alt photo-upload-icon"></i>
            <p>Нажмите для загрузки фото и видео</p>
            <p class="input-hint">Выберите фото или видео из галереи. Можно загрузить до ${MAX_MEDIA} файлов</p>
        `;
    }
}

// Навигация по шагам
function showStep(step) {
    for (let i = 1; i <= totalSteps; i++) {
        document.getElementById(`step${i}`).classList.remove('active');
    }
    document.getElementById(`step${step}`).classList.add('active');
    currentStep = step;
    updateProgressBar();
    
    if (step === 2) {
        setTimeout(() => {
            checkStep2Fields();
            const descriptionField = document.getElementById('description');
            if (descriptionField) {
                descriptionField.removeEventListener('input', handleDescriptionInput);
                descriptionField.addEventListener('input', handleDescriptionInput);
            }
        }, 100);
    }
    
    if (step === 3) {
        setTimeout(() => {
            checkStep3Fields();
            const priceField = document.getElementById('price');
            if (priceField) {
                priceField.removeEventListener('input', handlePriceInput);
                priceField.addEventListener('input', handlePriceInput);
            }
        }, 100);
    }
    
    if (step === 4) {
        setTimeout(checkStep4Fields, 100);
    }
    
    if (step === 5) {
        setTimeout(initMap, 100);
        setTimeout(checkStep5Fields, 200);
    }
    
    if (step === 6) {
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

// Валидация шагов
function validateStep(step) {
    if (step === 1) {
        if (formData.photos.length + formData.videos.length === 0) {
            showNotification('Ошибка', 'Загрузите хотя бы одно фото или видео', 'error');
            return false;
        }
        return true;
    }
    
    if (step === 2) {
        const description = document.getElementById('description').value.trim();
        if (!description || description.length < 3) {
            showNotification('Ошибка', 'Описание должно содержать минимум 3 символа', 'error');
            return false;
        }
        return true;
    }
    
    if (step === 3) {
        const price = document.getElementById('price').value.trim();
        if (!price || price.length < 1) {
            showNotification('Ошибка', 'Укажите цену или выберите "Договорная"', 'error');
            return false;
        }
        
        if (price !== 'Договорная') {
            const priceRegex = /^[0-9\-]+$/;
            if (!priceRegex.test(price)) {
                showNotification('Ошибка', 'Цена должна содержать только цифры и дефис', 'error');
                return false;
            }
        }
        return true;
    }
    
    if (step === 4) {
        return checkStep4Fields();
    }
    
    if (step === 5) {
        const region = document.getElementById('regionSelect').value;
        const city = document.getElementById('citySelect').value;
        
        if (!region) {
            showNotification('Ошибка', 'Выберите регион', 'error');
            return false;
        }
        
        if (!city) {
            showNotification('Ошибка', 'Выберите город или район', 'error');
            return false;
        }
        
        return true;
    }
    
    if (step === 6) {
        return true;
    }
    
    return true;
}

// Проверка полей шага 1
function checkStep1Fields() {
    const mediaCount = formData.photos.length + formData.videos.length;
    const nextBtn = document.getElementById('nextBtn1');
    const mediaHint = document.getElementById('mediaHint');
    
    if (mediaCount > 0) {
        nextBtn.disabled = false;
        mediaHint.classList.remove('show');
    } else {
        nextBtn.disabled = true;
        mediaHint.classList.add('show');
    }
}

// Проверка полей шага 2
function checkStep2Fields() {
    const description = document.getElementById('description').value.trim();
    const nextBtn = document.getElementById('nextBtn2');
    const descriptionHint = document.getElementById('descriptionHint');
    
    const isValid = description.length >= 3;
    
    nextBtn.disabled = !isValid;
    
    if (isValid) {
        descriptionHint.classList.remove('show');
    } else {
        descriptionHint.classList.add('show');
    }
    
    return isValid;
}

// Проверка полей шага 3
function checkStep3Fields() {
    const price = document.getElementById('price').value.trim();
    const nextBtn = document.getElementById('nextBtn3');
    const priceHint = document.getElementById('priceHint');
    
    let isValid = false;
    if (price === 'Договорная') {
        isValid = true;
    } else {
        const priceRegex = /^[0-9\-]+$/;
        isValid = price.length >= 1 && priceRegex.test(price);
    }
    
    nextBtn.disabled = !isValid;
    
    if (isValid) {
        priceHint.classList.remove('show');
    } else {
        priceHint.classList.add('show');
    }
    
    return isValid;
}

// Проверка полей шага 4
function checkStep4Fields() {
    const contactType = formData.contact_type;
    let isValid = false;
    const nextBtn = document.getElementById('nextBtn4');
    
    if (contactType === 'none') {
        isValid = true;
        document.getElementById('telegramHint').classList.remove('show');
        document.getElementById('phoneHint').classList.remove('show');
    } else if (contactType === 'telegram') {
        const telegram = document.getElementById('telegram').value.trim();
        const telegramHint = document.getElementById('telegramHint');
        
        const telegramRegex = /^@?[a-zA-Z0-9_]{5,}$/;
        if (telegram.length > 0 && telegramRegex.test(telegram)) {
            isValid = true;
            telegramHint.classList.remove('show');
        } else {
            telegramHint.classList.add('show');
        }
        
        document.getElementById('phoneHint').classList.remove('show');
    } else {
        const phone = document.getElementById('phone').value.trim();
        const phoneHint = document.getElementById('phoneHint');
        
        if (phone.length === 13 && phone.startsWith('+996')) {
            isValid = true;
            phoneHint.classList.remove('show');
        } else {
            phoneHint.classList.add('show');
        }
        
        document.getElementById('telegramHint').classList.remove('show');
    }
    
    nextBtn.disabled = !isValid;
    return isValid;
}

// Проверка полей шага 5
function checkStep5Fields() {
    const region = document.getElementById('regionSelect').value;
    const city = document.getElementById('citySelect').value;
    const nextBtn = document.getElementById('nextBtn5');
    const regionHint = document.getElementById('regionHint');
    const cityHint = document.getElementById('cityHint');
    
    let regionValid = false;
    let cityValid = false;
    
    if (region && region.length > 0) {
        regionValid = true;
        regionHint.classList.remove('show');
    } else {
        regionHint.classList.add('show');
    }
    
    if (city && city.length > 0) {
        cityValid = true;
        cityHint.classList.remove('show');
    } else {
        cityHint.classList.add('show');
    }
    
    nextBtn.disabled = !(regionValid && cityValid);
}

// Сохранение данных текущего шага
function saveCurrentStepData() {
    if (currentStep === 2) {
        const description = document.getElementById('description');
        if (description) {
            formData.description = description.value.trim();
        }
    }
    
    if (currentStep === 3) {
        const price = document.getElementById('price');
        if (price) {
            formData.price = price.value.trim();
        }
    }
    
    if (currentStep === 4) {
        if (formData.contact_type === 'telegram') {
            const telegram = document.getElementById('telegram');
            if (telegram) {
                let t = telegram.value.trim();
                if (t && !t.startsWith('@')) {
                    t = '@' + t;
                }
                telegram.value = t;
                formData.contacts = t;
            }
        } else if (formData.contact_type === 'phone') {
            const phone = document.getElementById('phone');
            if (phone) {
                formatPhoneInput();
                formData.contacts = phone.value.trim();
            }
        } else {
            formData.contacts = '';
        }
    }
    
    if (currentStep === 5) {
        const region = document.getElementById('regionSelect').value;
        const city = document.getElementById('citySelect').value;
        const address = document.getElementById('addressInput').value.trim();
        
        formData.location.region = region;
        formData.location.city = city;
        formData.location.address = address;
    }
}

// Установка цены "Договорная"
function setNegotiablePrice() {
    document.getElementById('price').value = 'Договорная';
    document.getElementById('price').readOnly = true;
    
    document.getElementById('priceBtnNegotiable').classList.add('active');
    document.getElementById('priceBtnEnter').classList.remove('active');
    
    checkStep3Fields();
}

// Фокусировка на поле ввода цены
function focusPriceInput() {
    const priceInput = document.getElementById('price');
    priceInput.value = '';
    priceInput.readOnly = false;
    priceInput.focus();
    priceInput.placeholder = 'Только цифры (например: 1500 или 1000-1500)';
    
    document.getElementById('priceBtnNegotiable').classList.remove('active');
    document.getElementById('priceBtnEnter').classList.add('active');
    
    checkStep3Fields();
}

// Выбор типа контактов
function selectContactType(type) {
    formData.contact_type = type;
    
    document.getElementById('telegramOption').classList.toggle('active', type === 'telegram');
    document.getElementById('phoneOption').classList.toggle('active', type === 'phone');
    document.getElementById('noContactOption').classList.toggle('active', type === 'none');
    
    document.getElementById('telegramInputGroup').style.display = type === 'telegram' ? 'block' : 'none';
    document.getElementById('phoneInputGroup').style.display = type === 'phone' ? 'block' : 'none';
    
    if (type === 'telegram') {
        const telegramField = document.getElementById('telegram');
        if (!telegramField.value.trim() && initialTelegramUsername) {
            telegramField.value = initialTelegramUsername;
            formData.contacts = initialTelegramUsername;
        }
    } else if (type === 'phone') {
        const phone = document.getElementById('phone');
        if (!phone.value.trim()) {
            phone.value = '+996';
            formData.contacts = '+996';
        }
    }
    
    checkStep4Fields();
}

// Форматирование номера телефона
function formatPhoneInput() {
    const phoneInput = document.getElementById('phone');
    let value = phoneInput.value.replace(/[^\d+]/g, '');
    
    if (!value.startsWith('+')) {
        value = '+' + value.replace(/^\++/, '');
    }
    
    if (!value.startsWith('+996')) {
        value = '+996' + value.replace(/^\+?996/, '').replace(/^\+?/, '');
    }
    
    const rest = value.slice(4).replace(/\D/g, '').slice(0, 9);
    phoneInput.value = '+996' + rest;
    
    checkStep4Fields();
}

// Обновление списка городов
function updateCities() {
    const regionSelect = document.getElementById('regionSelect');
    const citySelect = document.getElementById('citySelect');
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

// Инициализация карты
function initMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer || map) return;
    
    try {
        const centerLat = 42.8746;
        const centerLng = 74.5698;
        
        map = L.map('mapContainer').setView([centerLat, centerLng], 13);
        
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19,
            detectRetina: true
        });
        
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19,
            detectRetina: true
        });
        
        streetLayer.addTo(map);
        
        map.streetLayer = streetLayer;
        map.satelliteLayer = satelliteLayer;
        
        // Управление слоями
        document.getElementById('mapLayerBtn').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('satelliteLayerBtn').classList.remove('active');
            map.removeLayer(map.satelliteLayer);
            map.streetLayer.addTo(map);
        });
        
        document.getElementById('satelliteLayerBtn').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('mapLayerBtn').classList.remove('active');
            map.removeLayer(map.streetLayer);
            map.satelliteLayer.addTo(map);
        });
        
        // Кнопки управления
        document.getElementById('zoomInBtn').addEventListener('click', () => map.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => map.zoomOut());
        document.getElementById('locateBtn').addEventListener('click', () => getCurrentLocationFromBrowser(false));
        
        // Клик по карте
        map.on('click', function(e) {
            placeMarker(e.latlng.lat, e.latlng.lng);
            reverseGeocode(e.latlng.lat, e.latlng.lng);
        });
        
    } catch (e) {
        console.error('Ошибка инициализации карты:', e);
    }
}

// Размещение маркера
function placeMarker(lat, lng) {
    if (!map) return;
    
    const markerIcon = L.divIcon({
        html: '<i class="fas fa-map-pin" style="font-size: 32px; color: #ff3b30; text-shadow: 0 2px 4px rgba(0,0,0,0.3);"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: 'custom-marker'
    });
    
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng], { 
            icon: markerIcon,
            draggable: true 
        }).addTo(map);
        
        marker.on('dragend', function(e) {
            const position = marker.getLatLng();
            reverseGeocode(position.lat, position.lng);
        });
    }
    
    map.setView([lat, lng], 15);
    
    formData.location.coordinates = {
        latitude: lat,
        longitude: lng
    };
}

// Обратное геокодирование
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
                document.getElementById('addressInput').value = data.display_name;
                formData.location.address = data.display_name;
                
                document.getElementById('addressDisplay').innerHTML = `<i class="fas fa-map-pin" style="color: #ff3b30;"></i> ${data.display_name}`;
            }
        }
    } catch (error) {
        document.getElementById('addressInput').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        formData.location.address = document.getElementById('addressInput').value;
        
        document.getElementById('addressDisplay').innerHTML = `<i class="fas fa-map-pin" style="color: #ff3b30;"></i> ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    
    checkStep5Fields();
}

// Получение текущего местоположения
function getCurrentLocation() {
    getCurrentLocationFromBrowser(false);
}

// Получение местоположения из браузера
async function getCurrentLocationFromBrowser(isTelegramRequest = false) {
    const btn = isTelegramRequest ? document.getElementById('telegramLocationBtn') : document.getElementById('locationBtn');
    const originalText = btn.innerHTML;
    
    if (isTelegramRequest) {
        btn.innerHTML = '<div class="loader"></div> Определение...';
    } else {
        btn.innerHTML = '<div class="loader"></div> Определение местоположения...';
    }
    btn.disabled = true;
    
    if (!navigator.geolocation) {
        showNotification('Ошибка', 'Геолокация не поддерживается вашим браузером', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            formData.location.coordinates = {
                latitude: lat,
                longitude: lon
            };
            
            if (map) {
                placeMarker(lat, lon);
            }
            
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.address) {
                        document.getElementById('addressInput').value = data.display_name;
                        formData.location.address = data.display_name;
                        
                        document.getElementById('addressDisplay').innerHTML = `<i class="fas fa-check-circle" style="color: #34c759;"></i> ${data.display_name}`;
                        
                        showNotification('Успешно', 'Местоположение определено!', 'success');
                    }
                }
            } catch (error) {
                console.error('Ошибка геокодирования:', error);
            }
            
            checkStep5Fields();
            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        function(error) {
            let errorMessage = 'Не удалось определить местоположение';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Информация о местоположении недоступна.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Время ожидания определения местоположения истекло.';
                    break;
            }
            
            showNotification('Ошибка', errorMessage, 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Обновление превью
function updatePreview() {
    const previewMedia = document.getElementById('previewMedia');
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
    
    document.getElementById('previewDescription').textContent = formData.description || 'Не указано';
    document.getElementById('previewPrice').textContent = formData.price || 'Не указана';
    
    const contactsPreview = document.getElementById('previewContacts');
    if (formData.contact_type === 'telegram') {
        const username = (formData.contacts || '').replace(/^@/, '');
        contactsPreview.innerHTML = username ? `<a href="https://t.me/${username}" target="_blank">@${username}</a>` : 'Не указано';
    } else if (formData.contact_type === 'phone') {
        const phone = (formData.contacts || '').replace(/[^\d+]/g, '');
        contactsPreview.innerHTML = phone ? `<a href="https://wa.me/${phone}" target="_blank">WhatsApp</a> • <a href="tel:${phone}">Позвонить</a>` : 'Не указано';
    } else {
        contactsPreview.innerHTML = 'Не указаны';
    }
    
    const locationPreview = document.getElementById('previewLocation');
    let locationText = '';
    
    if (formData.location.region) {
        locationText += formData.location.region;
    }
    
    if (formData.location.city) {
        locationText += (locationText ? ', ' : '') + formData.location.city;
    }
    
    if (formData.location.address) {
        locationText += (locationText ? ', ' : '') + formData.location.address;
    }
    
    if (formData.location.coordinates) {
        locationText += (locationText ? ' (' : '') + '📍 по координатам' + (locationText ? ')' : '');
    }
    
    if (!locationText) {
        locationText = '📍 Не указана';
    }
    
    locationPreview.textContent = locationText;
}

// Сохранение всех данных
function saveAllData() {
    const description = document.getElementById('description');
    if (description) {
        formData.description = description.value.trim();
    }
    
    const price = document.getElementById('price');
    if (price) {
        formData.price = price.value.trim();
    }
    
    if (formData.contact_type === 'telegram') {
        const telegram = document.getElementById('telegram');
        if (telegram) {
            let t = telegram.value.trim();
            if (t && !t.startsWith('@')) {
                t = '@' + t;
            }
            telegram.value = t;
            formData.contacts = t;
        }
    } else if (formData.contact_type === 'phone') {
        const phone = document.getElementById('phone');
        if (phone) {
            formatPhoneInput();
            formData.contacts = phone.value.trim();
        }
    } else {
        formData.contacts = '';
    }
    
    const region = document.getElementById('regionSelect').value;
    const city = document.getElementById('citySelect').value;
    const address = document.getElementById('addressInput').value.trim();
    
    formData.location.region = region;
    formData.location.city = city;
    formData.location.address = address;
}

// Отправка формы
async function submitForm() {
    saveAllData();
    
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
    
    if (!formData.price || formData.price.length < 1) {
        showNotification('Ошибка', 'Укажите цену или выберите "Договорная"', 'error');
        showStep(3);
        return;
    }
    
    if (formData.contact_type !== 'none' && !formData.contacts) {
        showNotification('Ошибка', 'Укажите контакты для связи', 'error');
        showStep(4);
        return;
    }
    
    if (!formData.location.region || !formData.location.city) {
        showNotification('Ошибка', 'Укажите регион и город', 'error');
        showStep(5);
        return;
    }
    
    let fullAddress = '';
    if (formData.location.region) fullAddress += formData.location.region;
    if (formData.location.city) fullAddress += (fullAddress ? ', ' : '') + formData.location.city;
    if (formData.location.address) fullAddress += (fullAddress ? ', ' : '') + formData.location.address;
    
    const finalData = {
        ...formData,
        location: {
            ...formData.location,
            address: fullAddress
        },
        timestamp: new Date().toISOString(),
        source: isTelegram ? 'telegram_web_app' : 'web_app'
    };
    
    try {
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').innerHTML = '<div class="loader"></div> Публикация...';
        
        console.log('Отправка данных на сервер:', SERVER_URL + '/api/create-ad');
        
        const response = await fetch(`${SERVER_URL}/api/create-ad`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(finalData)
        });
        
        if (!response.ok) {
            let errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Ответ от сервера:', result);
        
        if (result.success) {
            document.getElementById('formContainer').style.display = 'none';
            document.getElementById('successScreen').style.display = 'block';
            
            if (result.data && result.data.post_url) {
                const postLink = document.getElementById('postLink');
                if (postLink) {
                    postLink.href = result.data.post_url;
                    postLink.innerHTML = `<i class="fas fa-external-link-alt"></i> Перейти к объявлению #${result.data.id}`;
                }
            }
            
            showNotification('Успешно', 'Объявление опубликовано!', 'success');
        } else {
            throw new Error(result.error || 'Неизвестная ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка при публикации:', error);
        
        let errorMessage = 'Ошибка при публикации: ';
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Не удалось подключиться к серверу. Проверьте интернет соединение.';
        } else {
            errorMessage += error.message || 'Проверьте соединение с интернетом';
        }
        
        showNotification('Ошибка', errorMessage, 'error');
    } finally {
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').innerHTML = 'Опубликовать <i class="fas fa-paper-plane"></i>';
    }
}

// Уведомления
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

// Обновление прогресс-бара
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

// Создание нового объявления
function createNewAd() {
    location.reload();
}

// Закрытие Telegram приложения
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
    
    if (isTelegram && tg && typeof tg.close === 'function') {
        try {
            tg.close();
            return true;
        } catch (e) {
            console.error('Error closing via tg.close():', e);
        }
    }
    
    showNotification('Информация', 'Вы можете закрыть вкладку вручную', 'info');
    return false;
}

// Анимация лепестков
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

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    checkTelegram();
    
    document.getElementById('price').value = 'Договорная';
    
    updateProgressBar();
    updateMediaCounter();
    initPetals();
    checkStep1Fields();
    
    // Обработчики событий
    document.getElementById('mediaUpload').addEventListener('click', () => {
        document.getElementById('mediaInput').click();
    });
    
    document.getElementById('mediaInput').addEventListener('change', async function(e) {
        const files = Array.from(e.target.files);
        await handleMediaFiles(files);
        e.target.value = '';
    });
    
    document.getElementById('description').addEventListener('input', () => checkStep2Fields());
    document.getElementById('price').addEventListener('input', handlePriceInput);
    document.getElementById('telegram').addEventListener('input', () => checkStep4Fields());
    document.getElementById('phone').addEventListener('input', () => {
        formatPhoneInput();
        checkStep4Fields();
    });
    
    document.getElementById('regionSelect').addEventListener('change', function() {
        formData.location.region = this.value;
        updateCities();
        checkStep5Fields();
    });
    
    document.getElementById('citySelect').addEventListener('change', function() {
        formData.location.city = this.value;
        checkStep5Fields();
    });
    
    document.getElementById('addressInput').addEventListener('input', function() {
        formData.location.address = this.value.trim();
        checkStep5Fields();
    });
    
    // Инициализация полей
    setTimeout(() => {
        checkStep1Fields();
        checkStep2Fields();
        checkStep3Fields();
        checkStep4Fields();
        checkStep5Fields();
    }, 500);
    
    // Тестовое соединение с бэкендом
    fetch(`${SERVER_URL}/health`)
        .then(response => {
            if (response.ok) {
                console.log('✅ Бэкенд доступен');
            } else {
                console.warn('⚠️ Бэкенд ответил с ошибкой:', response.status);
            }
        })
        .catch(error => {
            console.error('❌ Не удалось подключиться к бэкенду:', error.message);
        });
});

// Экспорт функций для HTML
window.nextStep = nextStep;
window.prevStep = prevStep;
window.setNegotiablePrice = setNegotiablePrice;
window.focusPriceInput = focusPriceInput;
window.selectContactType = selectContactType;
window.getTelegramLocation = getTelegramLocation;
window.getCurrentLocation = getCurrentLocation;
window.closeTelegramApp = closeTelegramApp;
window.createNewAd = createNewAd;
window.submitForm = submitForm;
window.handleDescriptionInput = () => checkStep2Fields();
window.handlePriceInput = function() {
    const priceField = document.getElementById('price');
    const value = priceField.value.trim();
    
    const filteredValue = value.replace(/[^0-9\-]/g, '');
    if (filteredValue !== value) {
        priceField.value = filteredValue;
    }
    
    if (value === 'Договорная') {
        document.getElementById('priceBtnNegotiable').classList.add('active');
        document.getElementById('priceBtnEnter').classList.remove('active');
    } else if (value.length > 0) {
        document.getElementById('priceBtnNegotiable').classList.remove('active');
        document.getElementById('priceBtnEnter').classList.add('active');
    } else {
        document.getElementById('priceBtnNegotiable').classList.remove('active');
        document.getElementById('priceBtnEnter').classList.remove('active');
    }
    
    checkStep3Fields();
};