require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const FormData = require('form-data');
const ytdl = require('ytdl-core'); // Added YouTube downloader
const app = express();

const bot = new Telegraf(process.env.TOKEN);

app.use(express.json());

// Image upload to Imgbb function (existing)
async function uploadToImgbb(fileLink, filename = 'Angel.jpg') {
  try {
    console.log('Uploading to Imgbb:', fileLink);
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const formData = new FormData();
    formData.append('image', response.data, { filename });
    formData.append('key', process.env.IMGBB_API_KEY);

    const uploadResponse = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: { ...formData.getHeaders() },
    });

    console.log('Imgbb upload successful:', uploadResponse.data.data.url);
    return uploadResponse.data.data.url;
  } catch (error) {
    console.error('Error uploading to imgbb:', error.message);
    return null;
  }
}

// New YouTube download function
async function downloadYouTubeVideo(url) {
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
    
    return {
      title: info.videoDetails.title,
      downloadUrl: format.url,
      size: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
      duration: info.videoDetails.lengthSeconds
    };
  } catch (error) {
    console.error('Error downloading YouTube video:', error.message);
    return null;
  }
}

// Start command (existing)
bot.start(async (ctx) => {
  const welcomeMessage = '🎉 Welcome to the Telegram Bot! You can upload images and download YouTube videos.';
  const photoUrl = 'https://graph.org/file/4e8a1172e8ba4b7a0bdfa.jpg';

  await ctx.replyWithPhoto(photoUrl, {
    caption: welcomeMessage,
    reply_markup: {
      inline_keyboard: [
        [{ text: '✨ Join our Channel ✨', url: 'https://t.me/Opleech_WD' }]
      ]
    }
  });
});

// Photo handler (existing)
bot.on('photo', async (ctx) => {
  try {
    const fileID = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileID);
    const imgbbUrl = await uploadToImgbb(fileLink);
    const photoUrl = 'https://i.ibb.co/KrBGcSS/Picsart-24-10-11-20-04-52-069.jpg';

    if (imgbbUrl) {
      await ctx.replyWithPhoto(photoUrl, {
        caption: `⎙ Here is your image link:\n\〇 Copy your link\n\n\`${imgbbUrl}\``,
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💾 View Image', url: imgbbUrl }]
          ]
        }
      });
    } else {
      await ctx.reply('Failed to upload image to Imgbb.');
    }
  } catch (error) {
    console.error('Error handling photo message:', error.message);
  }
});

// New YouTube URL handler
bot.on('text', async (ctx) => {
  const url = ctx.message.text;
  
  // Check if it's a YouTube URL
  if (ytdl.validateURL(url)) {
    try {
      const msg = await ctx.reply('Processing your video...');
      const videoData = await downloadYouTubeVideo(url);
      
      if (videoData) {
        const progressMsg = `📁 : ${videoData.title} | ${videoData.size}\n` +
                          `🚀 : 100%\n` +
                          `⚡ : Download Complete\n` +
                          `⏱️ : ${Math.floor(videoData.duration / 60)}:${videoData.duration % 60}`;

        await ctx.telegram.editMessageText(
          ctx.chat.id,
          msg.message_id,
          null,
          progressMsg,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📥 Download Video', url: videoData.downloadUrl }]
              ]
            }
          }
        );
      } else {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          msg.message_id,
          null,
          'Failed to process video.'
        );
      }
    } catch (error) {
      await ctx.reply('Error processing YouTube video: ' + error.message);
    }
  }
});

// API endpoint (existing)
app.post('/send-image', async (req, res) => {
  const { fileLink } = req.body;
  const imgbbUrl = await uploadToImgbb(fileLink);
  res.json(imgbbUrl ? { success: true, url: imgbbUrl } : { success: false, message: 'Failed to upload' });
});

// New YouTube API endpoint
app.post('/youtube-download', async (req, res) => {
  const { url } = req.body;
  const videoData = await downloadYouTubeVideo(url);
  res.json(videoData ? { success: true, data: videoData } : { success: false, message: 'Failed to download' });
});

app.get('/', (req, res) => {
  res.send('Welcome to the Telegram Imgbb & YouTube Bot API!');
});

bot.launch().then(() => console.log('Bot launched successfully'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
