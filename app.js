const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const cors = require('cors');
const path = require('path');

const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
var connectedSocket = null;

app.use(cors())

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: true
}));

app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use('/plugins', express.static(path.join(__dirname, 'plugins')));
app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--single-process",
      "--disable-extensions",
    ],
  },
  authStrategy: new LocalAuth({
    // clientId: "client1",
    // dataPath: './.wwebjs_auth'
  }),
  // webVersionCache: {
  // type: 'none'
  // type: 'remote',
  // remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2413.51-beta.html',
  // remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014547162-alpha.html'
  // }
});

client.on('ready', async () => {
  const version = await client.getWWebVersion();
  console.log(`Whatsapp siap digunakan!`);
  console.log(`WWeb v${version}`);
});

client.on('message', msg => {
  if (msg.selectedButtonId == 'test') {
    return msg.reply('You clicked the button!');
  } else if (msg.selectedRowId == 'test') {
      return msg.reply('You clicked that section');
  }else if(msg.body == '!ping') {
    msg.reply('pong');
  } else if (msg.body == 'good morning') {
    msg.reply('selamat pagi');
  } else if (msg.body == '!groups') {
    client.getChats().then(chats => {
      const groups = chats.filter(chat => chat.isGroup);

      if (groups.length == 0) {
        msg.reply('You have no group yet.');
      } else {
        let replyMsg = '*YOUR GROUPS*\n\n';
        groups.forEach((group, i) => {
          replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
        });
        replyMsg += '_You can use the group id to send a message to the group._'
        msg.reply(replyMsg);
      }
    });
  } else if (msg.body == "command") {
    const { from } = msg;
    let embed = new WwebjsSender.MessageEmbed()
      .setTitle("✅ | Successful process!")
      .setDescription(
        "The process has been successful! To confirm press *Yes* or press *No* to cancel."
      )
      .setFooter("WwebjsSender")
      .setTimestamp();

    let button1 = new WwebjsSender.MessageButton()
      .setCustomId("yes")
      .setLabel("Yes");

    let button2 = new WwebjsSender.MessageButton()
      .setCustomId("no")
      .setLabel("No");

    WwebjsSender.send({
      client: client,
      number: from,
      embed: embed,
      button: [button1, button2],
    });
  }
  // Downloading media
  // if (msg.hasMedia) {
  //   msg.downloadMedia().then(media => {
  //     // To better understanding
  //     // Please look at the console what data we get
  //     console.log(media);

  //     if (media) {
  //       // The folder to store: change as you want!
  //       // Create if not exists
  //       const mediaPath = './downloaded-media/';

  //       if (!fs.existsSync(mediaPath)) {
  //         fs.mkdirSync(mediaPath);
  //       }

  //       // Get the file extension by mime-type
  //       const extension = mime.extension(media.mimetype);
        
  //       // Filename: change as you want! 
  //       // I will use the time for this example
  //       // Why not use media.filename? Because the value is not certain exists
  //       const filename = new Date().getTime();

  //       const fullFilename = mediaPath + filename + '.' + extension;

  //       // Save to file
  //       try {
  //         // fs.writeFileSync(fullFilename, media.data, { encoding: 'base64' }); 
  //         console.log('File downloaded successfully!', fullFilename);
  //       } catch (err) {
  //         console.log('Failed to save the file:', err);
  //       }
  //     }
  //   });
  // }
});

client.initialize();

// Socket IO
io.on('connection', function(socket) {
  connectedSocket = socket; //simpan connected socket
  socket.emit('message', 'Connecting...');
  socket.emit('notification', 'Connecting...');

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'Silakan scan QR code!');
      socket.emit('notification', 'Silakan scan QR code!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp siap digunakan!');
    socket.emit('message', 'Whatsapp siap digunakan!');
    socket.emit('notification', 'Whatsapp siap digunakan!');
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'AUTHENTICATED!');
    // socket.emit('message', `BOT Whatsapp terhubung ke ${client.info.pushname} (${client.info.wid.user}).`);
    // console.log(`BOT Whatsapp terhubung ke ${client.info.pushname} (${client.info.wid.user}).`);
  });

  client.on('auth_failure', function(session) {
    socket.emit('message', 'Gagal autentikasi, restarting...');
    socket.emit('notification', 'Gagal autentikasi, restarting...');
  });

  // Listen for message acknowledgement
  client.on('message_ack', (message, ack) => {
    /*
    == ACK VALUES ==
    ACK_ERROR: -1   => error kirim ke server
    ACK_PENDING: 0  => pending kirim ke server
    ACK_SERVER: 1   => berhasil dikirim ke server
    ACK_DEVICE: 2   => berhasil dikirim ke penerima
    ACK_READ: 3     => telah dibaca
    ACK_PLAYED: 4   => telah diputar (audio/video)
    */
    if (ack === 1) {
      // console.log(`Pesan ID:${message.id.id} ke berhasil dikirim ke server.`);
      socket.emit('message_ack', `Pesan ID:${message.id.id} berhasil dikirim ke server.`);
    } else if (ack === 2) {
      // console.log(`Pesan ID:${message.id.id} ke berhasil dikirim ke ${(message.to).replace(/@c\.us$/, '')}.`);
      socket.emit('message_ack', `Pesan ID:${message.id.id} berhasil dikirim ke ${(message.to).replace(/@c\.us$/, '')}.`);
    } else if (ack === -1) {
      // console.log(`Pesan ID:${message.id.id} ke berhasil dikirim ke ${(message.to).replace(/@c\.us$/, '')}.`);
      socket.emit('message_ack', `Pesan gagal dikirim ke ${(message.to).replace(/@c\.us$/, '')}. Keterangan server: ${(message.message)}`);
    }
  });

  // Check if already connected
  if (client.info && client.info.pushname) {
    socket.emit('notification', `BOT Whatsapp terhubung ke ${client.info.pushname} (${client.info.wid.user}).`);
  }

  // Interval check for connection status
  const checkConnectionStatus = setInterval(() => {
    if (client.info && client.info.pushname) {
      socket.emit('notification', `BOT Whatsapp terhubung ke ${client.info.pushname} (${client.info.wid.user}).`);
    } else {
      socket.emit('notification', 'Whatsapp tidak terhubung.');
    }
  }, 5000);

  client.on('disconnected', (reason) => {
    clearInterval(checkConnectionStatus);
    socket.emit('notification', 'Whatsapp terputus!');
    client.destroy();
    client.initialize();
    connectedSocket = null;
  });
});


const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}

// Send message
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    connectedSocket.emit('message', `Nomor ${number.replace(/@c\.us$/, '')} tidak terdaftar`);
    connectedSocket.emit('response', `{ status: false, message: 'Nomor ${number.replace(/@c\.us$/, '')} tidak terdaftar!'}`);
    return res.status(422).json({
      status: false,
      message: 'Nomor tidak terdaftar!'
    });
  }

  client.sendMessage(number, message).then(response => {
    connectedSocket.emit('response', response);
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send media local
app.post('/send-media-local', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const media = MessageMedia.fromFilePath('./local-file.png');

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    connectedSocket.emit('response', response);
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send media upload
app.post('/send-media-upload', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const file = req.files.file;
  const fileName = req.body.title || file.name || 'Media';
  const media = new MessageMedia(file.mimetype, file.data.toString('base64'), fileName);

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    connectedSocket.emit('response', response);
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send media link
app.post('/send-media-link', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file;
  const fileName = req.body.title || 'Media';

  // const media = MessageMedia.fromFilePath('./image-example.png');
  // const file = req.files.file;
  // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, fileName);

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    connectedSocket.emit('response', response);
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Send msg button
app.post('/send-button', async (req, res) => {
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file;
  const btn = new Buttons(body, buttons, title, footer);

  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    connectedSocket.emit('response', response);
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

const findGroupByName = async function(name) {
  const group = await client.getChats().then(chats => {
    return chats.find(chat => 
      chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
}

// Send message to group
// You can use chatID or group name, yea!
app.post('/send-group-message', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const message = req.body.message;

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      connectedSocket.emit('message', `Grup ${groupName} tidak ditemukan!`);
      connectedSocket.emit('response', `{ status: false, message: "Grup ${groupName} tidak ditemukan!"}`);
      return res.status(422).json({
        status: false,
        message: `Grup ${groupName} tidak ditemukan!`
      });
    }
    chatId = group.id._serialized;
  }

  client.sendMessage(chatId, message).then(response => {
    connectedSocket.emit('response', response);
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// Clearing message on spesific chat
app.post('/clear-message', [
  body('number').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    connectedSocket.emit('message', `Nomor ${number.replace(/@c\.us$/, '')} tidak terdaftar`);
    connectedSocket.emit('response', `{ status: false, message: 'Nomor ${number.replace(/@c\.us$/, '')} tidak terdaftar!'}`);
    return res.status(422).json({
      status: false,
      message: 'Nomor tidak terdaftar!'
    });
  }

  const chat = await client.getChatById(number);
  
  chat.clearMessages().then(response => {
    connectedSocket.emit('response', response);
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      response: err
    });
  })
});

// Delete your own message on spesific chat
app.post('/delete-message', [
  body('number').notEmpty(),
], async (req, res) => {
  // Validasi input
  const errors = validationResult(req).formatWith(({ msg }) => msg);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = phoneNumberFormatter(req.body.number);
  const limit = req.body.limit || 1;
  const everyone = req.body.everyone || true;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    connectedSocket.emit('message', `Nomor ${number.replace(/@c\.us$/, '')} tidak terdaftar`);
    connectedSocket.emit('response', `{ status: false, message: 'Nomor ${number.replace(/@c\.us$/, '')} tidak terdaftar!'}`);
    return res.status(422).json({
      status: false,
      message: 'Nomor tidak terdaftar!'
    });
  }

  try {
    const chat = await client.getChatById(number);

    const messages = await chat.fetchMessages({ limit: limit }); // message limit
    const deletePromises = messages
      .filter(msg => msg.fromMe)
      .map(async (msg) => {
        try {
          await msg.delete(everyone); // true: delete for everyone, false: delete for me
          console.log(`Pesan dihapus: ${msg.body}`);
        } catch (err) {
          console.error('Gagal menghapus pesan:', err);
        }
      });

    await Promise.all(deletePromises);

    connectedSocket.emit('response', `Pesan yang dikirim Anda ke ${number.replace(/@c\.us$/, '')} berhasil dihapus.`);
    res.status(200).json({
      status: true,
      message: `Pesan berhasil dihapus untuk nomor ${number.replace(/@c\.us$/, '')}`
    });
  } catch (err) {
    console.error(err);
    connectedSocket.emit('response', err);
    res.status(500).json({
      status: false,
      message: 'Gagal menghapus pesan!',
      error: err.message
    });
  }
});

server.listen(port, function() {
  console.log('Menyiapkan Whatsapp...');
  console.log('Whatsapp BOT berjalan pada PORT: ' + port);
});
