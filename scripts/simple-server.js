#!/usr/bin/env node

/**
 * Simple Express server to verify we can start a server
 */

const express = require('express');
const app = express();
const PORT = 9999;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Simple server running on http://localhost:${PORT}`);
}); 