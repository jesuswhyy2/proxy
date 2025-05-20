const express = require('express');
const axios = require('axios');
const app = express();
const crypto = require('crypto-js');
const xml2js = require('xml2js');

app.use(express.raw({ type: "*/*", limit: "5mb" }));

// ЗАМЕНИТЕ на ваши данные
const TOKEN = 'W5ukeSEkIDsZhNh9hLAak4SgN'; // <-- Токен, который вы указали в WeCom
const ENCODING_AES_KEY = 'b8VFKaTRdt0IBqrjqzf7Gp9pycoRrrNTm5YgBm7oXNA'; // <-- EncodingAESKey (Base64)
const CORP_ID = 'your_corpid'; // <-- ID вашей компании

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDi8ML9lJ1UzSHIpwO8m993ytNaMf3Buu4HQQ5t_4Ez6-EiYc_HD0-qFcHuQ3bvgfY_w/exec ';

// === Функции для расшифровки ===

function base64Decode(str) {
  return Buffer.from(str, 'base64');
}

function decryptWeComData(encryptedData, aesKey) {
  const key = base64Decode(aesKey + '=');
  const iv = key.slice(0, 16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(true);

  let decoded = decipher.update(base64Decode(encryptedData), 'binary', 'utf8');
  decoded += decipher.final('utf8');
  return decoded;
}

function verifySignature(token, timestamp, nonce, encrypt, signature) {
  const shasum = crypto.createHash('sha1');
  const arr = [token, timestamp, nonce, encrypt].sort().join('');
  shasum.update(arr);
  return shasum.digest('hex') === signature;
}

// === GET для проверки URL ===

app.get('/', (req, res) => {
  const { msg_signature, timestamp, nonce, echostr } = req.query;

  if (!msg_signature || !timestamp || !nonce || !echostr) {
    return res.status(400).send('Missing parameters');
  }

  const decrypted = decryptWeComData(echostr, ENCODING_AES_KEY);

  // Проверяем подпись
  if (!verifySignature(TOKEN, timestamp, nonce, echostr, msg_signature)) {
    return res.status(401).send('Invalid signature');
  }

  // Возвращаем только само сообщение (msg из decrypted)
  const corpIdStartIndex = decrypted.indexOf(CORP_ID);
  const msgLength = decrypted.readUInt32BE(16); // Сдвиг на 16 байт (random + msg_len)
  const msg = decrypted.substr(20, msgLength);
  res.send(msg);
});

// === POST для получения сообщений ===

app.post('/', async (req, res) => {
  try {
    const parser = new xml2js.Parser({ explicitArray: false });
    const xmlData = req.body.toString();

    parser.parseString(xmlData, (err, result) => {
      if (err) return res.status(400).send('Parse error');

      const encrypt = result.xml.Encrypt;
      const decrypted = decryptWeComData(encrypt, ENCODING_AES_KEY);

      const corpIdStartIndex = decrypted.indexOf(CORP_ID);
      const msgLength = decrypted.readUInt32BE(16);
      const msg = decrypted.substr(20, msgLength);

      // Передаем оригинальное тело в GAS
      axios.post(SCRIPT_URL, msg, {
        headers: { 'Content-Type': 'text/plain' }
      }).then(r => {
        res.type('xml').send('<xml><return><![CDATA[0]]></return></xml>');
      }).catch(e => {
        console.error('GAS Error:', e.message);
        res.status(500).send('Proxy error');
      });
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Proxy error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
