import 'dotenv/config';   // 👈 MUST be first

import express from 'express';
import bodyParser from 'body-parser';
import bhashHandler from './api/bhash.js';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/bhash', (req, res) => {
  bhashHandler(req, res);
});

app.get('/', (req, res) => {
  res.send('BHASH webhook local test running');
});

app.listen(PORT, () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
});
