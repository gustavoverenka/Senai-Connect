const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rota de teste (Health Check)
app.get('/api/status', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'Backend do SENAI Connect está online e funcionando.',
  });
});

// Rotas de Autenticação
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

module.exports = app;