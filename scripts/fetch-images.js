const https = require('https');
const fs = require('fs');

const images = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Pothole_in_the_road.jpg', file: 'public/images/pothole.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/TMC_Control_Room.jpg', file: 'public/images/control-room.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Server_Room_Data_Center.jpg', file: 'public/images/transparency.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/City_of_London_Dashboard.jpg', file: 'public/images/dashboard.jpg' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Mobile_phone_in_hand_%28Unsplash%29.jpg', file: 'public/images/citizen-reporting.jpg' }
];

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Failed ' + res.statusCode));
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

(async () => {
  if (!fs.existsSync('public/images')) fs.mkdirSync('public/images');
  for (const img of images) {
    try {
      await download(img.url, img.file);
      console.log('Downloaded', img.file);
    } catch (e) {
      console.error('Failed', img.file, e);
    }
  }
})();
