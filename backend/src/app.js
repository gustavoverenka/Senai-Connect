const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

//rota de teste(Health)
app.get('/api/status', (req, res) => {
    return res.json({
        status: 'ok',
        message: 'Backend esta online e funcionando.'
    });
});

module.exports = app;