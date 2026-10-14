# Moneys for iPhone

A private phone view of a personal finance Google Sheet. This repo only holds the app shell.
No financial data lives here: the app pulls it live from the owner's sheet through a private,
key-protected Apps Script connection, and the key exists only on the paired phone.

`widget.js` is an optional home screen widget for the free Scriptable app. The app fills in the
private connection details when you copy it from Settings, so the file here has placeholders only.
