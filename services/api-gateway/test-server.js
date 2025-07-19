console.log('Test server starting...');

const express = require('express');
const app = express();
const PORT = 3001;

app.get('/test', (req, res) => {
  res.json({ message: 'Test server working!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

console.log('Test server file loaded completely');
