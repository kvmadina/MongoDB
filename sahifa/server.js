// server.js — сервер лабораторной работы.
// В лабе был выдан готовым; в ДЗ к 29.09 сюда добавлены маршруты DELETE и PATCH.

import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';

// --- 1. Проверяем, что переменная окружения задана ---
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Ошибка: переменная MONGODB_URI не найдена.');
  console.error('Создайте файл .env в этой папке и скопируйте туда строку из .env.example,');
  console.error('вставив вместо ЛОГИН и ПАРОЛЬ свои данные от MongoDB Atlas.');
  process.exit(1);
}

// --- 2. Схема и модель товара ---
const mahsulotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Укажите название товара (name)'],
    trim: true,
  },
  category: {
    type: String,
    enum: {
      values: ['kitob', 'telefon', 'kiyim', 'oziq-ovqat'],
      message: 'Категория "{VALUE}" не поддерживается. Разрешено: kitob, telefon, kiyim, oziq-ovqat',
    },
    required: [true, 'Укажите категорию товара (category)'],
  },
  price: {
    type: Number,
    required: [true, 'Укажите цену товара (price)'],
    min: [0, 'Цена не может быть отрицательной'],
  },
  qty: {
    type: Number,
    default: 0,
    min: [0, 'Количество не может быть отрицательным'],
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Явно указываем имя коллекции — mahsulotlar
const Mahsulot = mongoose.model('Mahsulot', mahsulotSchema, 'mahsulotlar');

// --- 3. Express-приложение ---
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Единая функция для отправки ошибок клиенту (как в уроке 4)
function sendError(res, error) {
  if (error.name === 'ValidationError') {
    const problems = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({
      error: 'Данные не прошли проверку',
      problems,
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: `Некорректное значение поля "${error.path}"`,
    });
  }

  console.error('Непредвиденная ошибка:', error);
  return res.status(500).json({
    error: 'Внутренняя ошибка сервера',
  });
}

// GET /mahsulotlar — список товаров, новые сверху
app.get('/mahsulotlar', async (req, res) => {
  try {
    const royxat = await Mahsulot.find().sort({ addedAt: -1 });
    res.json(royxat);
  } catch (error) {
    sendError(res, error);
  }
});

// POST /mahsulotlar — добавить товар
app.post('/mahsulotlar', async (req, res) => {
  try {
    const mahsulot = await Mahsulot.create(req.body);
    res.status(201).json(mahsulot);
  } catch (error) {
    sendError(res, error);
  }
});

// DELETE /mahsulotlar/:id — удалить товар
app.delete('/mahsulotlar/:id', async (req, res) => {
  try {
    // Кривой _id — CastError, его ловит sendError и отвечает 400
    const ochirilgan = await Mahsulot.findByIdAndDelete(req.params.id);

    // _id нормальный, но товара нет: тут не ошибка, а null — отсюда и берётся 404
    if (!ochirilgan) {
      return res.status(404).json({ error: 'Товар с таким _id не найден' });
    }

    res.json(ochirilgan);
  } catch (error) {
    sendError(res, error);
  }
});

// PATCH /mahsulotlar/:id — изменить поля товара
app.patch('/mahsulotlar/:id', async (req, res) => {
  try {
    const yangilangan = await Mahsulot.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // вернуть документ ПОСЛЕ изменения, а не до
      runValidators: true, // проверить новые значения по схеме: чужая category → ValidationError → 400
    });

    if (!yangilangan) {
      return res.status(404).json({ error: 'Товар с таким _id не найден' });
    }

    res.json(yangilangan);
  } catch (error) {
    sendError(res, error);
  }
});

const PORT = process.env.PORT || 3000;

// --- 4. Подключаемся к MongoDB, и только потом запускаем сервер ---
try {
  await mongoose.connect(MONGODB_URI);
  console.log('Подключение к MongoDB установлено.');
} catch (error) {
  console.error('Не удалось подключиться к MongoDB:', error.message);
  console.error('Подсказка: проверьте логин/пароль в MONGODB_URI и Network Access → Add Current IP в MongoDB Atlas.');
  process.exit(1);
}

// Express 5: если порт занят, ошибка приходит в колбэк listen — без (error) сервер
// выглядит запущенным, хотя на самом деле не слушает порт.
app.listen(PORT, (error) => {
  if (error) {
    console.error('Не удалось запустить сервер:', error.message);
    process.exit(1);
  }
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
