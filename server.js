const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.text({ type: "*/*" }));

// ЗАМЕНИ НА СВОЙ URL Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDi8ML9lJ1UzSHIpwO8m993ytNaMf3Buu4HQQ5t_4Ez6-EiYc_HD0-qFcHuQ3bvgfY_w/exec';

// Проверка URL от WeCom
app.get('/', (req, res) => {
  const echostr = req.query.echostr;
  res.send(echostr || 'OK');
});

// Прокси POST-запросов
app.post('/', async (req, res) => {
  try {
    const result = await axios.post(SCRIPT_URL, req.body, {
      headers: { 'Content-Type': 'text/xml' }
    });
    res.send(result.data);
  } catch (error) {
    res.status(500).send('Proxy error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`);
});
