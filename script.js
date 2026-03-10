// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран
tg.ready();

// Данные
let selectedService = null;
let selectedDate = null;
let selectedTime = null;

// Константы
const services = [
    { id: 1, name: "Шиномонтаж легковой", price: 2500, duration: 60 },
    { id: 2, name: "Шиномонтаж внедорожник", price: 3500, duration: 90 },
    { id: 3, name: "Правка дисков", price: 1500, duration: 45 },
    { id: 4, name: "Ремонт прокола", price: 500, duration: 20 },
];

// Занятые слоты (в реальности приходят с сервера)
const bookedSlots = [
    { date: "2024-03-15", time: "10:00" },
    { date: "2024-03-15", time: "14:00" },
    { date: "2024-03-16", time: "11:00" },
];

// Функции отображения
function showStep(stepId) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(stepId).classList.add('active');
}

// Загрузка услуг
function loadServices() {
    const container = document.getElementById('services-list');
    container.innerHTML = '';
    
    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.dataset.id = service.id;
        card.innerHTML = `
            <div class="service-name">${service.name}</div>
            <div class="service-price">${service.price} ₽</div>
        `;
        card.addEventListener('click', () => selectService(service));
        container.appendChild(card);
    });
}

// Выбор услуги
function selectService(service) {
    selectedService = service;
    document.querySelectorAll('.service-card').forEach(c => {
        c.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Переход к выбору даты
    showStep('step-date');
    loadDates();
}

// Загрузка дат
function loadDates() {
    const container = document.getElementById('dates-list');
    container.innerHTML = '';
    
    const today = new Date();
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            weekday: 'short'
        });
        
        const btn = document.createElement('button');
        btn.className = 'date-btn';
        btn.dataset.date = dateStr;
        btn.textContent = displayDate;
        
        btn.addEventListener('click', () => selectDate(dateStr, btn));
        container.appendChild(btn);
    }
}

// Выбор даты
function selectDate(dateStr, btn) {
    selectedDate = dateStr;
    document.querySelectorAll('.date-btn').forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    
    // Переход к выбору времени
    showStep('step-time');
    loadTimes(dateStr);
}

// Загрузка времени
function loadTimes(dateStr) {
    const container = document.getElementById('times-list');
    container.innerHTML = '';
    
    // Генерируем все слоты с 9 до 21
    for (let hour = 9; hour < 21; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        
        // Проверяем, занят ли слот
        const isBooked = bookedSlots.some(slot => 
            slot.date === dateStr && slot.time === timeStr
        );
        
        const btn = document.createElement('button');
        btn.className = `time-btn ${isBooked ? 'disabled' : ''}`;
        btn.dataset.time = timeStr;
        btn.textContent = timeStr;
        
        if (!isBooked) {
            btn.addEventListener('click', () => selectTime(timeStr, btn));
        }
        
        container.appendChild(btn);
    }
}

// Выбор времени
function selectTime(timeStr, btn) {
    selectedTime = timeStr;
    document.querySelectorAll('.time-btn').forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    
    // Переход к подтверждению
    showConfirm();
}

// Подтверждение
function showConfirm() {
    document.getElementById('confirm-service').textContent = 
        `${selectedService.name} (${selectedService.price} ₽)`;
    
    const date = new Date(selectedDate);
    document.getElementById('confirm-date').textContent = 
        date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    
    document.getElementById('confirm-time').textContent = selectedTime;
    
    // Данные пользователя из Telegram
    const user = tg.initDataUnsafe?.user;
    document.getElementById('confirm-name').textContent = 
        user ? `${user.first_name} ${user.last_name || ''}` : 'Не указано';
    document.getElementById('confirm-phone').textContent = 
        'Будет запрошен при подтверждении';
    
    showStep('step-confirm');
}

// Отправка записи
function sendBooking() {
    // Показываем загрузку
    tg.MainButton.setText('Отправка...');
    tg.MainButton.showProgress(true);
    
    // Подготовка данных
    const bookingData = {
        service_id: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        user: tg.initDataUnsafe?.user
    };
    
    // Отправляем данные в бота
    tg.sendData(JSON.stringify(bookingData));
    
    // Переход к успеху
    setTimeout(() => {
        showStep('step-success');
        document.getElementById('success-detail').innerHTML = `
            ${selectedService.name}<br>
            ${new Date(selectedDate).toLocaleDateString('ru-RU')} в ${selectedTime}
        `;
    }, 500);
}

// Мои записи
function showMyAppointments() {
    tg.showAlert('Функция будет доступна после подключения бэкенда');
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    
    // Обработчики кнопок
    document.getElementById('confirm-btn').addEventListener('click', sendBooking);
    document.getElementById('back-btn').addEventListener('click', () => {
        showStep('step-time');
    });
    document.getElementById('new-booking-btn').addEventListener('click', () => {
        selectedService = null;
        selectedDate = null;
        selectedTime = null;
        showStep('step-services');
        loadServices();
    });
    document.getElementById('nav-my').addEventListener('click', showMyAppointments);
    document.getElementById('nav-home').addEventListener('click', () => {
        showStep('step-services');
    });
    
    // Настройка главной кнопки Telegram
    tg.MainButton.setText('Закрыть');
    tg.MainButton.onClick(() => tg.close());
    
    // Темная тема
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark');
    }
});
