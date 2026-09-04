const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const messageRoutes = require('./routes/messageRoutes');
const opportunityRoutes = require('./routes/opportunityRoutes');

const app = express();

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger.json');

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(morgan('dev'));

// Documentação da API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rota de teste (Health Check)
app.get('/api/status', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'Backend do SENAI Connect está online e funcionando.',
  });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/opportunities', opportunityRoutes);

module.exports = app;