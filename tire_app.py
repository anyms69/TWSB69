#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
МИНИ-ПРИЛОЖЕНИЕ: Шиномонтаж
Консольная демо-версия без токена и Telegram
Запуск: python tire_app.py
"""

import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# ========== БАЗА ДАННЫХ (в памяти) ==========

class Database:
    """Имитация базы данных в памяти"""
    
    def __init__(self):
        self.users = {}  # telegram_id -> {name, phone, reg_date}
        self.services = [
            {"id": 1, "name": "Шиномонтаж легковой", "price": 2500, "duration": 60},
            {"id": 2, "name": "Шиномонтаж внедорожник", "price": 3500, "duration": 90},
            {"id": 3, "name": "Правка дисков", "price": 1500, "duration": 45},
            {"id": 4, "name": "Ремонт прокола", "price": 500, "duration": 20},
        ]
        self.appointments = []  # список записей
        self.next_user_id = 1
        self.next_appointment_id = 1
        
        # Добавим несколько тестовых записей
        self._add_test_data()
    
    def _add_test_data(self):
        """Добавляет тестовые данные для демо"""
        # Тестовый пользователь
        self.users[12345] = {
            "id": self.next_user_id,
            "name": "Иван Петров",
            "phone": "+7 (999) 123-45-67",
            "reg_date": datetime.now().isoformat()
        }
        self.next_user_id += 1
        
        # Тестовые записи
        tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
        day_after = (datetime.now() + timedelta(days=2)).date().isoformat()
        
        self.appointments.append({
            "id": self.next_appointment_id,
            "user_id": 1,
            "service_id": 1,
            "service_name": "Шиномонтаж легковой",
            "date": tomorrow,
            "time": "10:00",
            "status": "active"
        })
        self.next_appointment_id += 1
        
        self.appointments.append({
            "id": self.next_appointment_id,
            "user_id": 1,
            "service_id": 3,
            "service_name": "Правка дисков",
            "date": day_after,
            "time": "15:30",
            "status": "active"
        })
        self.next_appointment_id += 1
    
    def get_user(self, telegram_id):
        return self.users.get(telegram_id)
    
    def create_user(self, telegram_id, name, phone):
        user_id = self.next_user_id
        self.users[telegram_id] = {
            "id": user_id,
            "name": name,
            "phone": phone,
            "reg_date": datetime.now().isoformat()
        }
        self.next_user_id += 1
        return user_id
    
    def get_services(self):
        return [(s["id"], s["name"], s["price"]) for s in self.services]
    
    def get_service_name(self, service_id):
        for s in self.services:
            if s["id"] == service_id:
                return s["name"]
        return "Неизвестная услуга"
    
    def get_free_slots(self, date):
        """Возвращает свободные слоты на дату (9:00-21:00)"""
        all_slots = [f"{h:02d}:00" for h in range(9, 21)]
        
        busy = [
            a["time"] for a in self.appointments 
            if a["date"] == date and a["status"] == "active"
        ]
        
        return [slot for slot in all_slots if slot not in busy]
    
    def create_appointment(self, user_id, service_id, date, time):
        appointment = {
            "id": self.next_appointment_id,
            "user_id": user_id,
            "service_id": service_id,
            "service_name": self.get_service_name(service_id),
            "date": date,
            "time": time,
            "status": "active"
        }
        self.appointments.append(appointment)
        self.next_appointment_id += 1
        return appointment
    
    def get_user_appointments(self, telegram_id):
        user = self.users.get(telegram_id)
        if not user:
            return []
        
        return [
            (a["date"], a["time"], a["service_name"], a["status"], a["id"])
            for a in self.appointments
            if a["user_id"] == user["id"] and a["status"] == "active"
        ]
    
    def cancel_appointment(self, appointment_id, telegram_id):
        user = self.users.get(telegram_id)
        if not user:
            return False
        
        for a in self.appointments:
            if a["id"] == appointment_id and a["user_id"] == user["id"]:
                a["status"] = "cancelled"
                return True
        return False
    
    def get_stats(self):
        today = datetime.now().date().isoformat()
        total = len([a for a in self.appointments if a["date"] == today])
        active = len([a for a in self.appointments if a["date"] == today and a["status"] == "active"])
        completed = len([a for a in self.appointments if a["date"] == today and a["status"] == "completed"])
        cancelled = len([a for a in self.appointments if a["date"] == today and a["status"] == "cancelled"])
        return total, active, completed, cancelled


# ========== ИНТЕРФЕЙС ==========

class TireApp:
    """Консольное приложение шиномонтажа"""
    
    def __init__(self):
        self.db = Database()
        self.current_user = None
        self.current_telegram_id = 12345  # Для демо используем тестового пользователя
        
    def clear_screen(self):
        """Очистка экрана"""
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def print_header(self, title):
        """Печать заголовка"""
        print("\n" + "="*60)
        print(f" 🛞 {title} ")
        print("="*60)
    
    def print_menu(self, options):
        """Печать меню"""
        print("\n📋 Меню:")
        for key, value in options.items():
            print(f"   {key}. {value}")
        print("\n   0. Выход")
    
    def get_choice(self, prompt="👉 Выберите действие: "):
        """Получение выбора пользователя"""
        try:
            return int(input(f"\n{prompt}"))
        except ValueError:
            return -1
    
    def press_enter(self):
        """Ожидание нажатия Enter"""
        input("\n⏎ Нажмите Enter чтобы продолжить...")
    
    def main_menu(self):
        """Главное меню"""
        while True:
            self.clear_screen()
            self.print_header("ШИНОМОНТАЖ 'КОЛЕСО'")
            
            if self.current_user:
                print(f"\n👤 Клиент: {self.current_user['name']}")
                print(f"📱 Телефон: {self.current_user['phone']}")
            
            print("\n🕒 Режим работы: 9:00 - 21:00")
            print("📍 Адрес: ул. Автомобильная, 15")
            
            menu = {
                1: "📅 Записаться на шиномонтаж",
                2: "📋 Мои записи",
                3: "📊 Статистика (админ)",
            }
            self.print_menu(menu)
            
            choice = self.get_choice()
            
            if choice == 0:
                self.clear_screen()
                print("\n👋 Спасибо за использование приложения!")
                print("   Возвращайтесь к нам снова!\n")
                sys.exit(0)
            elif choice == 1:
                self.book_appointment()
            elif choice == 2:
                self.show_my_appointments()
            elif choice == 3:
                self.show_stats()
            else:
                print("\n❌ Неверный выбор. Попробуйте снова.")
                self.press_enter()
    
    def book_appointment(self):
        """Процесс записи"""
        self.clear_screen()
        self.print_header("ЗАПИСЬ НА ШИНОМОНТАЖ")
        
        # Проверка регистрации
        if not self.current_user:
            print("\n👋 Похоже, вы здесь впервые.")
            print("Давайте зарегистрируемся за 10 секунд!")
            
            name = input("\n📝 Введите ваше имя: ").strip()
            if not name:
                name = "Гость"
            
            print("\n📱 В демо-версии номер телефона не требуется.")
            phone = "+7 (999) 111-22-33"
            
            self.db.create_user(self.current_telegram_id, name, phone)
            self.current_user = self.db.get_user(self.current_telegram_id)
            print(f"\n✅ Спасибо, {name}! Регистрация завершена.")
            self.press_enter()
        
        # Шаг 1: Выбор услуги
        self.clear_screen()
        self.print_header("ШАГ 1: ВЫБЕРИТЕ УСЛУГУ")
        
        services = self.db.get_services()
        for sid, name, price in services:
            print(f"\n   {sid}. {name}")
            print(f"      💰 {price} ₽")
        
        try:
            service_id = int(input("\n👉 Введите номер услуги: "))
            if service_id not in [s[0] for s in services]:
                print("\n❌ Неверный номер услуги")
                self.press_enter()
                return
        except ValueError:
            print("\n❌ Введите число")
            self.press_enter()
            return
        
        # Шаг 2: Выбор даты
        self.clear_screen()
        self.print_header("ШАГ 2: ВЫБЕРИТЕ ДАТУ")
        
        dates = []
        for i in range(7):
            date = (datetime.now() + timedelta(days=i)).date()
            dates.append(date)
            print(f"\n   {i+1}. {date.strftime('%d.%m.%Y (%A)')}")
        
        try:
            date_choice = int(input("\n👉 Выберите дату (1-7): ")) - 1
            if date_choice < 0 or date_choice >= 7:
                print("\n❌ Неверный выбор")
                self.press_enter()
                return
            selected_date = dates[date_choice].isoformat()
        except ValueError:
            print("\n❌ Введите число")
            self.press_enter()
            return
        
        # Шаг 3: Выбор времени
        self.clear_screen()
        self.print_header("ШАГ 3: ВЫБЕРИТЕ ВРЕМЯ")
        
        slots = self.db.get_free_slots(selected_date)
        if not slots:
            print("\n❌ На эту дату нет свободных слотов!")
            print("   Попробуйте выбрать другую дату.")
            self.press_enter()
            return
        
        print(f"\n📅 {dates[date_choice].strftime('%d.%m.%Y')}")
        print("\nСвободное время:")
        for i, slot in enumerate(slots, 1):
            print(f"   {i}. {slot}")
        
        try:
            time_choice = int(input("\n👉 Выберите время (1-{}): ".format(len(slots)))) - 1
            if time_choice < 0 or time_choice >= len(slots):
                print("\n❌ Неверный выбор")
                self.press_enter()
                return
            selected_time = slots[time_choice]
        except ValueError:
            print("\n❌ Введите число")
            self.press_enter()
            return
        
        # Шаг 4: Подтверждение
        self.clear_screen()
        self.print_header("ПОДТВЕРЖДЕНИЕ ЗАПИСИ")
        
        service_name = self.db.get_service_name(service_id)
        
        print(f"\n📋 Детали записи:")
        print(f"\n   Услуга: {service_name}")
        print(f"   Дата: {dates[date_choice].strftime('%d.%m.%Y')}")
        print(f"   Время: {selected_time}")
        print(f"\n   Имя: {self.current_user['name']}")
        print(f"   Телефон: {self.current_user['phone']}")
        
        print("\n\n✅ Всё верно?")
        print("   1. Да, подтвердить")
        print("   2. Нет, отменить")
        
        choice = self.get_choice()
        
        if choice == 1:
            # Создаем запись
            appointment = self.db.create_appointment(
                self.current_user["id"],
                service_id,
                selected_date,
                selected_time
            )
            
            self.clear_screen()
            self.print_header("ЗАПИСЬ ПОДТВЕРЖДЕНА! ✅")
            print(f"\n   Услуга: {service_name}")
            print(f"   Дата: {dates[date_choice].strftime('%d.%m.%Y')}")
            print(f"   Время: {selected_time}")
            print(f"\n   Номер записи: #{appointment['id']}")
            print("\n   Ждём вас в нашем шиномонтаже!")
            print("   📍 ул. Автомобильная, 15")
        else:
            print("\n❌ Запись отменена.")
        
        self.press_enter()
    
    def show_my_appointments(self):
        """Показать записи пользователя"""
        self.clear_screen()
        self.print_header("МОИ ЗАПИСИ")
        
        if not self.current_user:
            print("\n👋 Вы не зарегистрированы.")
            print("   Запишитесь, чтобы увидеть свои записи.")
            self.press_enter()
            return
        
        apps = self.db.get_user_appointments(self.current_telegram_id)
        
        if not apps:
            print("\n📭 У вас пока нет активных записей.")
            print("   Хотите записаться? Вернитесь в главное меню и выберите пункт 1.")
        else:
            print(f"\n👤 {self.current_user['name']}, ваши записи:\n")
            for date, time, service, status, app_id in apps:
                print(f"   🛞 #{app_id} | {date} | {time}")
                print(f"      Услуга: {service}")
                print(f"      Статус: ✅ Активна")
                print(f"      Отменить: /cancel_{app_id}\n")
        
        self.press_enter()
    
    def show_stats(self):
        """Статистика для админа"""
        self.clear_screen()
        self.print_header("СТАТИСТИКА (АДМИН-ПАНЕЛЬ)")
        
        print("\n🔐 Доступно только администраторам\n")
        
        # В демо-версии показываем всем
        total, active, completed, cancelled = self.db.get_stats()
        
        today = datetime.now().date().strftime("%d.%m.%Y")
        
        print(f"📊 Статистика за {today}:\n")
        print(f"   Всего записей:   {total}")
        print(f"   ✅ Активных:      {active}")
        print(f"   ✅ Выполнено:     {completed}")
        print(f"   ❌ Отменено:      {cancelled}")
        
        print("\n\n📅 Все записи в системе:")
        for a in self.db.appointments:
            status_emoji = "✅" if a["status"] == "active" else "❌" if a["status"] == "cancelled" else "✅"
            print(f"   {status_emoji} {a['date']} {a['time']} | {a['service_name']} | #{a['id']}")
        
        self.press_enter()
    
    def run(self):
        """Запуск приложения"""
        # Автоматическая регистрация для демо
        self.current_user = self.db.get_user(self.current_telegram_id)
        
        try:
            self.main_menu()
        except KeyboardInterrupt:
            self.clear_screen()
            print("\n\n👋 До свидания! Хорошего дня!\n")
            sys.exit(0)


# ========== ЗАПУСК ==========

if __name__ == "__main__":
    app = TireApp()
    app.run()