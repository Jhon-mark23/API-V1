# API-V1

**API-V1** is a collection of utility and media APIs built with **ExpressJS** and designed to run on **Vercel**. This project includes endpoints such as Text-to-Speech (TTS), Spotify Downloader, TikTok Downloader, and more.

---

## Features

- **Text-to-Speech (TTS)** – Convert text into audio using Google TTS.
- **Spotify Downloader** – Web scrape Spotify tracks (metadata only).
- **TikTok Downloader** – Fetch TikTok videos without watermark.
- Built with **ExpressJS**, fully modular route structure.
- Easy to deploy on **Vercel**.

---

## How to build you own api

```basic api setup
module.exports = {
  name: "My API",
  category: "tools", // or "media", "utility", etc.
  description: "Brief description of the API",
  route: "/myapi",
  method: "GET", // or "POST"
  usage: "/myapi?param=value",
  handler: async (req, res) => {
    const { param } = req.query; // handle GET query params
    // Your API logic here
    res.json({ code: 0, msg: "success", data: { param } });
  },
};
````
if you want more api and you need to import npm pls update the package.json to work in vercel thanks

## Getting Started

## IMPORTANT 
make sure you add this in vercel
```npm
npm install 
```
![Alt Text](https://github.com/Jhon-mark23/API-V1/raw/refs/heads/main/screenshot/Screenshot_20260203_203830.jpg)


### Requirements

- Node.js >= 18  
- npm >= 9  
- Vercel account (for deployment)  

### Install Dependencies

```bash
git clone https://github.com/Jhon-mark23/API-V1.git
cd API-V1
npm install

````
