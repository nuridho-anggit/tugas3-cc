const express = require('express');
require('dotenv').config();
const AWS = require('aws-sdk');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Konfigurasi AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('views'));

// Route untuk menangani unggahan file
app.post('/upload', upload.single('file'), (req, res) => {
  const fileContent = fs.readFileSync(req.file.path);
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME, // Ganti dengan nama bucket Anda
    Key: req.file.originalname, // Nama file di S3
    Body: fileContent
  };

  s3.upload(params, function(err, data) {
    fs.unlinkSync(req.file.path); // Hapus file lokal setelah diunggah
    if (err) {
      return res.status(500).send("Error saat mengunggah file");
    }
    // Redirect ke halaman utama dengan parameter 'success' untuk menampilkan alert
    res.redirect('/?success=true');
  });
});

// Route untuk menampilkan daftar file
app.get('/files', async (req, res) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME, // Ganti dengan nama bucket Anda
  };

  try {
    const data = await s3.listObjectsV2(params).promise();

    const imageTags = data.Contents.map(item => {
      const fileUrl = `https://${params.Bucket}.s3.${AWS.config.region}.amazonaws.com/${item.Key}`;
      return `<div class="col-md-3">
                <div class="card mb-4 shadow-sm">
                  <img src="${fileUrl}" class="card-img-top" alt="${item.Key}">
                  <div class="card-body">
                    <p class="card-text">${item.Key}</p>
                  </div>
                </div>
              </div>`;
    });

    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daftar Foto Produk</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
        <div class="container mt-5">
          <h1 class="mb-4">Daftar Foto Produk</h1>
          <div class="row">
            ${imageTags.join('')}
          </div>
          <a href="/" class="btn btn-secondary">⬅️ Kembali</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Gagal mengambil daftar file dari S3");
  }
});

app.listen(3000, () => {
  console.log('Server berjalan di http://localhost:3000');
});
