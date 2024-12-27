const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const cors = require('cors');
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const PORT = 9003;

// Sajikan file HTML dan aset dari folder public
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true
  }
});

// Menampilkan QR code untuk autentikasi
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

// Setelah login berhasil
client.on('ready', () => {
  console.log('WhatsApp Web client is ready!');
});

// Menjalankan client WhatsApp
client.initialize();

// Endpoint untuk mengirim URL ke WhatsApp
app.post('/send-url', async (req, res) => {
  const { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    return res.status(400).json({ success: false, error: 'Missing phoneNumber or message' });
  }

  const chatId = `${phoneNumber}@c.us`;

  try {
    await client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cuaca', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cuaca.html'));
});

app.get('/gempa', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gempa.html'));
});

app.get('/jarak', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'jarak.html'));
});

// Endpoint TempMail
app.get('/api/tempmail', async (req, res) => {
  try {
    const response = await fetch('https://btch.us.kg/tempmail');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tempmail' });
  }
});

// Endpoint GetMail
app.get('/api/getmail', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }
  try {
    const response = await fetch(`https://btch.us.kg/getmail?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Fetch weather information
app.get('/api/weather', async (req, res) => {
  const city = req.query.city;
  try {
    const response = await fetch(`https://btch.us.kg/weather?text=${city}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data.' });
  }
});

// Fetch earthquake information
app.get('/api/earthquake', async (req, res) => {
  try {
    const response = await fetch('https://btch.us.kg/gempa');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch earthquake data.' });
  }
});

// Fetch distance information
app.get('/api/distance', async (req, res) => {
  const { dari, ke } = req.query;
  try {
    // Mengambil data dari API eksternal
    const response = await fetch(`https://btch.us.kg/jarak?dari=${dari}&ke=${ke}`);
    const data = await response.json();

    // Memeriksa apakah data yang diterima memiliki status yang benar
    if (data.status) {
      // Pastikan data URL gambar ada dan valid
      if (data.url && data.url.data) {
        // Mengirim data yang telah diproses dengan menambahkan URL gambar
        res.json({
          status: true,
          url: {
            desc: data.url.desc || 'Deskripsi tidak tersedia', // Menampilkan deskripsi
            data: data.url.data // URL gambar
          }
        });
      } else {
        res.status(404).json({ error: 'Gambar tidak ditemukan.' });
      }
    } else {
      res.status(404).json({ error: 'Data tidak ditemukan.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil data jarak.' });
  }
});

// Endpoint untuk fetch JSON
app.get('/fetch-videos', async (req, res) => {
  const url = 'https://raw.githubusercontent.com/dreamliner21/mainDB/refs/heads/master/videy.json';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});

// Data awal untuk video dan gambar
let backgroundState = "video"; // Initial state
let backgrounds = {
  image: [],
  video: []
};

// Fetch backgrounds from external JSON
async function fetchBackgrounds() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/dreamliner21/mainDB/refs/heads/master/bg.json');
    const data = await response.json();
    backgrounds = data;
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
  }
}

// Initial fetch of backgrounds
fetchBackgrounds();

// Update backgrounds periodically (e.g., every 1 hour)
setInterval(fetchBackgrounds, 3600000); // 1 hour in milliseconds

// Endpoint for background switching
app.get('/api/background', (req, res) => {
  if (!backgrounds.image.length || !backgrounds.video.length) {
    return res.status(500).json({ error: "Background data not loaded yet." });
  }

  const currentBackground = backgroundState;
  backgroundState = currentBackground === "video" ? "image" : "video"; // Toggle state

  // Select a random URL from the corresponding array
  const urlList = backgrounds[currentBackground];
  const randomUrl = urlList[Math.floor(Math.random() * urlList.length)];

  res.json({
    type: currentBackground,
    url: randomUrl
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
