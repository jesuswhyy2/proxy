const express = require('express');
const axios = require('axios');
const app = express();

// Получаем тело "как есть", без парсинга
app.use(express.raw({ type: "*/*", limit: "5mb" }));

// ЗАМЕНИ НА СВОЙ URL Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDi8ML9lJ1UzSHIpwO8m993ytNaMf3Buu4HQQ5t_4Ez6-EiYc_HD0-qFcHuQ3bvgfY_w/exec ';

// Проверка URL от WeCom
app.get('/', (req, res) => {
  const echostr = req.query.echostr;
  if (echostr) {
    res.send(echostr);
  } else {
    res.status(400).send('Missing echostr');
  }
});

// Прокси POST-запросов
app.post('/', async (req, res) => {
  try {
    const result = await axios.post(SCRIPT_URL, req.body, {
      headers: {
        'Content-Type': req.headers['content-type'] || 'text/plain'
      }
    });
    res.send(result.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send('Proxy error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`);
});
