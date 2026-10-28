const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const express = require("express");
const { body, validationResult } = require("express-validator");
const socketIO = require("socket.io");
const qrcode = require("qrcode");
const http = require("http");
const fs = require("fs");
const { phoneNumberFormatter } = require("./helpers/formatter");
const fileUpload = require("express-fileupload");
const axios = require("axios");
const mime = require("mime-types");
const cors = require("cors");
const path = require("path");

const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
var connectedSocket = null;
var currentWWebVersion = "";


app.use(cors());

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);
app.use(
  fileUpload({
    debug: true,
  }),
);

app.use("/dist", express.static(path.join(__dirname, "dist")));
app.use("/plugins", express.static(path.join(__dirname, "plugins")));
app.get("/", (req, res) => {
  res.sendFile("index.html", {
    root: __dirname,
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
  // webVersion: '2.3000.1042931217-alpha',

  // webVersionCache: {
  //   type: 'local',
  //   remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/refs/heads/main/html/2.3000.1042931217-alpha.html',
  // },
});

client.on("ready", async () => {
  const version = await client.getWWebVersion();
  currentWWebVersion = version;
  console.log(`Whatsapp siap digunakan!`);
  console.log(`WWeb v${version}`);
});

client.on("message", (msg) => {
  if (msg.selectedButtonId == "test") {
    return msg.reply("You clicked the button!");
  } else if (msg.selectedRowId == "test") {
    return msg.reply("You clicked that section");
  } else if (msg.body == "!ping") {
    msg.reply("pong");
  } else if (msg.body == "good morning") {
    msg.reply("selamat pagi");
  } else if (msg.body == "!groups") {
    client.getChats().then((chats) => {
      const groups = chats.filter((chat) => chat.isGroup);

      if (groups.length == 0) {
        msg.reply("You have no group yet.");
      } else {
        let replyMsg = "*YOUR GROUPS*\n\n";
        groups.forEach((group, i) => {
          replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
        });
        replyMsg +=
          "_You can use the group id to send a message to the group._";
        msg.reply(replyMsg);
      }
    });
  } else if (msg.body == "command") {
    const { from } = msg;
    let embed = new WwebjsSender.MessageEmbed()
      .setTitle("✅ | Successful process!")
      .setDescription(
        "The process has been successful! To confirm press *Yes* or press *No* to cancel.",
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
io.on("connection", function (socket) {
  connectedSocket = socket; //simpan connected socket
  socket.emit("message", "Connecting...");
  socket.emit("notification", "Connecting...");

  if (currentWWebVersion) {
    socket.emit("version", currentWWebVersion);
  }


  client.on("qr", (qr) => {
    console.log("QR RECEIVED", qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit("message", "Silakan scan QR code!");
      socket.emit("notification", "Silakan scan QR code!");
    });
  });

  client.on("ready", () => {
    socket.emit("ready", "Whatsapp siap digunakan!");
    socket.emit("message", "Whatsapp siap digunakan!");
    socket.emit("notification", "Whatsapp siap digunakan!");
    if (currentWWebVersion) {
      socket.emit("version", currentWWebVersion);
    }
  });

  client.on("authenticated", () => {
    socket.emit("authenticated", "AUTHENTICATED!");

    // socket.emit('message', `BOT Whatsapp terhubung ke ${client.info.pushname} (${client.info.wid.user}).`);
    // console.log(`BOT Whatsapp terhubung ke ${client.info.pushname} (${client.info.wid.user}).`);
  });

  client.on("auth_failure", function (session) {
    socket.emit("message", "Gagal autentikasi, restarting...");
    socket.emit("notification", "Gagal autentikasi, restarting...");
  });

  // Listen for message acknowledgement
  client.on("message_ack", (message, ack) => {
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
      socket.emit(
        "message_ack",
        `Pesan ID:${message.id.id} berhasil dikirim ke server.`,
      );
    } else if (ack === 2) {
      // console.log(`Pesan ID:${message.id.id} ke berhasil dikirim ke ${(message.to).replace(/@c\.us$/, '')}.`);
      socket.emit(
        "message_ack",
        `Pesan ID:${message.id.id} berhasil dikirim ke ${message.to.replace(/@c\.us$/, "")}.`,
      );
    } else if (ack === -1) {
      // console.log(`Pesan ID:${message.id.id} ke berhasil dikirim ke ${(message.to).replace(/@c\.us$/, '')}.`);
      socket.emit(
        "message_ack",
        `Pesan gagal dikirim ke ${message.to.replace(/@c\.us$/, "")}. Keterangan server: ${message.message}`,
      );
    }
  });

  // Check if already connected
  if (client.info) {
    let pushname = client.info.pushname;
    let number = client.info.wid.user;
    socket.emit(
      "notification",
      `BOT Whatsapp terhubung ke ${pushname} (${number}).`,
    );
    socket.emit("authenticated", "AUTHENTICATED!");
  }

  // Interval check for connection status
  const checkConnectionStatus = setInterval(() => {
    if (client.info) {
      let pushname = client.info.pushname;
      let number = client.info.wid.user;
      socket.emit(
        "notification",
        `BOT Whatsapp terhubung ke ${pushname} (${number}).`,
      );
      if (currentWWebVersion) {
        socket.emit("version", currentWWebVersion);
      }
    } else {
      socket.emit("notification", "Whatsapp tidak terhubung.");
    }
  }, 5000);

  client.on("disconnected", (reason) => {
    clearInterval(checkConnectionStatus);
    socket.emit("notification", "Whatsapp terputus!");
    client.destroy();
    client.initialize();
    connectedSocket = null;
  });
});

const checkRegisteredNumber = async function (number) {
  try {
    const numberId = await client.getNumberId(number);
    if (numberId) {
      console.log(`send to ${number} LID ${JSON.stringify(numberId, null, 2)} `);
      return number; // Kembalikan nomor asli @c.us. Menggunakan @lid langsung menyebabkan kegagalan pengiriman media dan ack -1
    }
  } catch (e) {
    // ignore
  }

  return false;
};

const emitSocket = (event, data) => {
  if (connectedSocket) {
    connectedSocket.emit(event, data);
  } else {
    io.emit(event, data);
  }
};

const findGroupByName = async function (name) {
  try {
    const chats = await client.getChats();
    return chats.find(
      (chat) => chat.isGroup && chat.name.toLowerCase() === name.toLowerCase(),
    );
  } catch (err) {
    console.error("Error finding group by name:", err);
    return null;
  }
};

// ==========================================
// UNIFIED API ENDPOINT (SMART AUTO-DETECT)
// ==========================================
app.post("/send", async (req, res) => {
  try {
    const action = (req.body.action || "").toLowerCase();
    const rawTarget = req.body.to || req.body.number || req.body.target || "";
    const groupParam = req.body.group || req.body.name || "";
    const caption = req.body.caption || req.body.message || "";
    const fileName = req.body.filename || req.body.title || "";

    // 1. Resolve Target (Recipient or Group)
    let chatId = "";
    let isGroup = false;

    if (groupParam) {
      if (groupParam.endsWith("@g.us")) {
        chatId = groupParam;
        isGroup = true;
      } else {
        const foundGroup = await findGroupByName(groupParam);
        if (!foundGroup) {
          emitSocket("message", `Grup "${groupParam}" tidak ditemukan!`);
          emitSocket("response", {
            status: false,
            message: `Grup "${groupParam}" tidak ditemukan!`,
          });
          return res.status(422).json({
            status: false,
            message: `Grup "${groupParam}" tidak ditemukan!`,
          });
        }
        chatId = foundGroup.id._serialized;
        isGroup = true;
      }
    } else if (rawTarget.endsWith("@g.us")) {
      chatId = rawTarget;
      isGroup = true;
    } else if (rawTarget) {
      const formattedNumber = phoneNumberFormatter(rawTarget);
      const registeredNumberId = await checkRegisteredNumber(formattedNumber);
      if (!registeredNumberId) {
        emitSocket(
          "message",
          `Nomor ${formattedNumber.replace(/@c\.us$/, "")} tidak terdaftar`,
        );
        emitSocket("response", {
          status: false,
          message: `Nomor ${formattedNumber.replace(/@c\.us$/, "")} tidak terdaftar!`,
        });
        return res.status(422).json({
          status: false,
          message: "Nomor tidak terdaftar!",
        });
      }
      chatId = registeredNumberId;
    } else {
      return res.status(422).json({
        status: false,
        message: "Parameter tujuan ('to', 'number', atau 'group') wajib diisi!",
      });
    }

    // 2. Action: Delete Message
    if (action === "delete") {
      const limit = parseInt(req.body.limit, 10) || 1;
      const everyone =
        req.body.everyone !== undefined
          ? req.body.everyone === true || req.body.everyone === "true"
          : true;

      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: limit });
      const deletePromises = messages
        .filter((msg) => msg.fromMe)
        .map(async (msg) => {
          try {
            await msg.delete(everyone);
          } catch (err) {
            console.error("Gagal menghapus pesan:", err);
          }
        });

      await Promise.all(deletePromises);
      const successMsg = `Pesan ke ${chatId.replace(/@c\.us$|@g\.us$/, "")} berhasil dihapus.`;
      emitSocket("response", successMsg);
      return res.status(200).json({
        status: true,
        type: "delete",
        target: chatId,
        message: successMsg,
      });
    }

    // 3. Action: Clear Message (Chat History)
    if (action === "clear") {
      const chat = await client.getChatById(chatId);
      const response = await chat.clearMessages();
      emitSocket("response", response);
      return res.status(200).json({
        status: true,
        type: "clear",
        target: chatId,
        response: response,
      });
    }

    // 4. Action: Send Media via File Upload (multipart/form-data)
    if (req.files && req.files.file) {
      const uploadedFile = req.files.file;
      const mediaName = fileName || uploadedFile.name || "Media";
      const media = new MessageMedia(
        uploadedFile.mimetype,
        uploadedFile.data.toString("base64"),
        mediaName,
      );

      const response = await client.sendMessage(chatId, media, {
        caption: caption,
      });
      emitSocket("response", response);
      return res.status(200).json({
        status: true,
        type: "media_upload",
        target: chatId,
        response: response,
      });
    }

    // 5. Action: Send Media via URL Link
    const fileUrl = req.body.file || req.body.file_url || "";
    if (
      typeof fileUrl === "string" &&
      (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"))
    ) {
      let mimetype;
      const responseAxios = await axios.get(fileUrl, {
        responseType: "arraybuffer",
      });
      mimetype =
        responseAxios.headers["content-type"] ||
        mime.lookup(fileUrl) ||
        "application/octet-stream";
      const attachmentBase64 = Buffer.from(responseAxios.data).toString("base64");
      const mediaName =
        fileName || path.basename(new URL(fileUrl).pathname) || "Media";

      const media = new MessageMedia(mimetype, attachmentBase64, mediaName);
      const response = await client.sendMessage(chatId, media, {
        caption: caption,
      });
      emitSocket("response", response);
      return res.status(200).json({
        status: true,
        type: "media_link",
        target: chatId,
        response: response,
      });
    }

    // 6. Action: Send Media from Local Server Path
    const localFilePath = req.body.file_path || "";
    if (localFilePath) {
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({
          status: false,
          message: `File lokal tidak ditemukan pada path: ${localFilePath}`,
        });
      }
      const media = MessageMedia.fromFilePath(localFilePath);
      const response = await client.sendMessage(chatId, media, {
        caption: caption,
      });
      emitSocket("response", response);
      return res.status(200).json({
        status: true,
        type: "media_local",
        target: chatId,
        response: response,
      });
    }

    // 7. Action: Send Text Message
    const textMessage = req.body.message;
    if (textMessage) {
      if (isGroup) {
        const response = await client.sendMessage(chatId, textMessage);
        emitSocket("response", response);
        return res.status(200).json({
          status: true,
          type: "group_message",
          target: chatId,
          response: response,
        });
      } else {
        // Individual message with ACK tracking
        const response = await client.sendMessage(chatId, textMessage);

        return new Promise((resolve) => {
          let resolved = false;

          const checkAck = (msg, ack) => {
            if (msg.id.id === response.id.id) {
              if (resolved) return;
              resolved = true;
              client.removeListener("message_ack", checkAck);
              clearTimeout(ackTimeout);

              if (ack === -1 || ack === 0) {
                const responseData = {
                  status: false,
                  type: "text",
                  target: chatId,
                  message: "Nomor belum dikenali bot.",
                };
                emitSocket("response", responseData);
                return resolve(res.status(400).json(responseData));
              } else {
                const responseData = {
                  status: true,
                  type: "text",
                  target: chatId,
                  response: response,
                };
                emitSocket("response", responseData);
                return resolve(res.status(200).json(responseData));
              }
            }
          };

          client.on("message_ack", checkAck);

          const ackTimeout = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            client.removeListener("message_ack", checkAck);

            if (response.ack === -1 || response.ack === 0) {
              return resolve(
                res.status(400).json({
                  status: false,
                  type: "text",
                  target: chatId,
                  message: "Nomor belum dikenali bot.",
                }),
              );
            } else {
              const responseData = {
                status: true,
                type: "text",
                target: chatId,
                response: response,
              };
              emitSocket("response", responseData);
              return resolve(res.status(200).json(responseData));
            }
          }, 5000);
        });
      }
    }

    // Default: jika tidak ada aksi yang cocok
    return res.status(422).json({
      status: false,
      message:
        "Parameter tidak lengkap. Sediakan salah satu dari: 'message' (teks), 'file' (upload/URL), 'file_path' (file lokal), atau 'action' ('delete'/'clear').",
    });
  } catch (error) {
    console.error("Error pada /send:", error);
    emitSocket("response", { status: false, error: error.message });
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal server.",
      error: error.message,
    });
  }
});


// Send message
app.post(
  "/send-message",
  [body("number").notEmpty(), body("message").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
      return msg;
    });

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped(),
      });
    }

    const number = phoneNumberFormatter(req.body.number || req.body.to);
    const message = req.body.message;

    const registeredNumberId = await checkRegisteredNumber(number);

    if (!registeredNumberId) {
      emitSocket(
        "message",
        `Nomor ${number.replace(/@c\.us$/, "")} tidak terdaftar`,
      );
      emitSocket(
        "response",
        `{ status: false, message: 'Nomor ${number.replace(/@c\.us$/, "")} tidak terdaftar!'}`,
      );
      return res.status(422).json({
        status: false,
        message: "Nomor tidak terdaftar!",
      });
    }

    client
      .sendMessage(registeredNumberId, message)
      .then((response) => {
        const checkAck = (msg, ack) => {
          if (msg.id.id === response.id.id) {
            if (ack === -1 || ack === 0) {
              let responseData = {
                status: false,
                number: number,
                lid: registeredNumberId,
                message: "Nomor belum dikenali bot.",
              };
              emitSocket("response", responseData);
              res.status(400).json(responseData);
            } else {
              let responseData = {
                status: true,
                number: number,
                lid: registeredNumberId,
                response: response,
              };
              emitSocket("response", responseData);
              res.status(200).json(responseData);
            }
            client.removeListener("message_ack", checkAck);
            clearTimeout(ackTimeout);
          }
        };

        client.on("message_ack", checkAck);

        // Beri batas waktu (timeout) 5 detik jika event message_ack tidak kunjung dipanggil
        const ackTimeout = setTimeout(() => {
          client.removeListener("message_ack", checkAck);

          if (response.ack === -1 || response.ack === 0) {
            res.status(400).json({
              status: false,
              number: number,
              lid: registeredNumberId,
              message: "Nomor belum dikenali bot.",
            });
          } else {
            let responseData = {
              status: true,
              number: number,
              lid: registeredNumberId,
              response: response,
            };
            emitSocket("response", responseData);
            res.status(200).json(responseData);
          }
        }, 5000);
      })
      .catch((err) => {
        emitSocket("response", err);
        res.status(500).json({
          status: false,
          response: err.message || err,
        });
      });
  },
);

// Send media local
app.post("/send-media-local", async (req, res) => {
  const rawNumber = req.body.number || req.body.to;
  if (!rawNumber) {
    return res.status(422).json({
      status: false,
      message: "Parameter 'number' atau 'to' wajib diisi!",
    });
  }
  const number = phoneNumberFormatter(rawNumber);
  const caption = req.body.caption || "";
  const media = MessageMedia.fromFilePath("./local-file.png");

  client
    .sendMessage(number, media, {
      caption: caption,
    })
    .then((response) => {
      emitSocket("response", response);
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      console.error("Gagal mengirim media local:", err);
      emitSocket("response", err);
      res.status(500).json({
        status: false,
        response: err.message || err,
      });
    });
});

// Send media upload
app.post("/send-media-upload", async (req, res) => {
  const rawNumber = req.body.number || req.body.to;
  if (!rawNumber) {
    return res.status(422).json({
      status: false,
      message: "Parameter 'number' atau 'to' wajib diisi!",
    });
  }
  if (!req.files || !req.files.file) {
    return res.status(422).json({
      status: false,
      message: "File belum diunggah via parameter 'file'!",
    });
  }
  const number = phoneNumberFormatter(rawNumber);
  const caption = req.body.caption || "";
  const file = req.files.file;
  const fileName = req.body.title || req.body.filename || file.name || "Media";
  const media = new MessageMedia(
    file.mimetype,
    file.data.toString("base64"),
    fileName,
  );

  client
    .sendMessage(number, media, {
      caption: caption,
    })
    .then((response) => {
      emitSocket("response", response);
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      console.error("Gagal mengirim media upload:", err);
      emitSocket("response", err);
      res.status(500).json({
        status: false,
        response: err.message || err,
      });
    });
});

// Send media link
app.post("/send-media-link", async (req, res) => {
  const rawNumber = req.body.number || req.body.to;
  if (!rawNumber) {
    return res.status(422).json({
      status: false,
      message: "Parameter 'number' atau 'to' wajib diisi!",
    });
  }
  const fileUrl = req.body.file || req.body.file_url;
  if (!fileUrl) {
    return res.status(422).json({
      status: false,
      message: "Parameter tautan 'file' wajib diisi!",
    });
  }
  const number = phoneNumberFormatter(rawNumber);
  const caption = req.body.caption || "";
  const fileName = req.body.title || req.body.filename || "Media";

  try {
    let mimetype;
    const attachment = await axios
      .get(fileUrl, {
        responseType: "arraybuffer",
      })
      .then((response) => {
        mimetype = response.headers["content-type"];
        return response.data.toString("base64");
      });

    const media = new MessageMedia(mimetype, attachment, fileName);

    client
      .sendMessage(number, media, {
        caption: caption,
      })
      .then((response) => {
        emitSocket("response", response);
        res.status(200).json({
          status: true,
          response: response,
        });
      })
      .catch((err) => {
        console.error("Gagal mengirim media link:", err);
        emitSocket("response", err);
        res.status(500).json({
          status: false,
          response: err.message || err,
        });
      });
  } catch (err) {
    console.error("Gagal mengunduh berkas dari URL:", err);
    emitSocket("response", err);
    res.status(500).json({
      status: false,
      response: err.message || err,
    });
  }
});

// Send msg button
app.post("/send-button", async (req, res) => {
  const rawNumber = req.body.number || req.body.to;
  if (!rawNumber) {
    return res.status(422).json({
      status: false,
      message: "Parameter 'number' atau 'to' wajib diisi!",
    });
  }
  const number = phoneNumberFormatter(rawNumber);
  const caption = req.body.caption || "";
  const fileUrl = req.body.file;

  try {
    let mimetype;
    const attachment = await axios
      .get(fileUrl, {
        responseType: "arraybuffer",
      })
      .then((response) => {
        mimetype = response.headers["content-type"];
        return response.data.toString("base64");
      });

    const media = new MessageMedia(mimetype, attachment, "Media");

    client
      .sendMessage(number, media, {
        caption: caption,
      })
      .then((response) => {
        emitSocket("response", response);
        res.status(200).json({
          status: true,
          response: response,
        });
      })
      .catch((err) => {
        emitSocket("response", err);
        res.status(500).json({
          status: false,
          response: err.message || err,
        });
      });
  } catch (err) {
    emitSocket("response", err);
    res.status(500).json({
      status: false,
      response: err.message || err,
    });
  }
});

// Send message to group
// You can use chatID or group name, yea!
app.post(
  "/send-group-message",
  [
    body("id").custom((value, { req }) => {
      if (!value && !req.body.name) {
        throw new Error("Invalid value, you can use `id` or `name`");
      }
      return true;
    }),
    body("message").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
      return msg;
    });

    if (!errors.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: errors.mapped(),
      });
    }

    let chatId = req.body.id;
    const groupName = req.body.name;
    const message = req.body.message;

    // Find the group by name
    if (!chatId) {
      const group = await findGroupByName(groupName);
      if (!group) {
        emitSocket("message", `Grup ${groupName} tidak ditemukan!`);
        emitSocket(
          "response",
          `{ status: false, message: "Grup ${groupName} tidak ditemukan!"}`,
        );
        return res.status(422).json({
          status: false,
          message: `Grup ${groupName} tidak ditemukan!`,
        });
      }
      chatId = group.id._serialized;
    }

    client
      .sendMessage(chatId, message)
      .then((response) => {
        emitSocket("response", response);
        res.status(200).json({
          status: true,
          response: response,
        });
      })
      .catch((err) => {
        emitSocket("response", err);
        res.status(500).json({
          status: false,
          response: err.message || err,
        });
      });
  },
);

// Clearing message on spesific chat
app.post("/clear-message", [body("number").notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    });
  }

  const number = phoneNumberFormatter(req.body.number || req.body.to);

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    emitSocket(
      "message",
      `Nomor ${number.replace(/@c\.us$/, "")} tidak terdaftar`,
    );
    emitSocket(
      "response",
      `{ status: false, message: 'Nomor ${number.replace(/@c\.us$/, "")} tidak terdaftar!'}`,
    );
    return res.status(422).json({
      status: false,
      message: "Nomor tidak terdaftar!",
    });
  }

  const chat = await client.getChatById(isRegisteredNumber);

  chat
    .clearMessages()
    .then((response) => {
      emitSocket("response", response);
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      emitSocket("response", err);
      res.status(500).json({
        status: false,
        response: err.message || err,
      });
    });
});

// Delete your own message on spesific chat
app.post("/delete-message", [body("number").notEmpty()], async (req, res) => {
  // Validasi input
  const errors = validationResult(req).formatWith(({ msg }) => msg);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    });
  }

  const number = phoneNumberFormatter(req.body.number || req.body.to);
  const limit = req.body.limit || 1;
  const everyone = req.body.everyone || true;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    emitSocket(
      "message",
      `Nomor ${number.replace(/@c\.us$/, "")} tidak terdaftar`,
    );
    emitSocket(
      "response",
      `{ status: false, message: 'Nomor ${number.replace(/@c\.us$/, "")} tidak terdaftar!'}`,
    );
    return res.status(422).json({
      status: false,
      message: "Nomor tidak terdaftar!",
    });
  }

  try {
    const chat = await client.getChatById(isRegisteredNumber);

    const messages = await chat.fetchMessages({ limit: limit }); // message limit
    const deletePromises = messages
      .filter((msg) => msg.fromMe)
      .map(async (msg) => {
        try {
          await msg.delete(everyone); // true: delete for everyone, false: delete for me
          console.log(`Pesan dihapus: ${msg.body}`);
        } catch (err) {
          console.error("Gagal menghapus pesan:", err);
        }
      });

    await Promise.all(deletePromises);

    emitSocket(
      "response",
      `Pesan yang dikirim Anda ke ${number.replace(/@c\.us$/, "")} berhasil dihapus.`,
    );
    res.status(200).json({
      status: true,
      message: `Pesan berhasil dihapus untuk nomor ${number.replace(/@c\.us$/, "")}`,
    });
  } catch (err) {
    console.error(err);
    emitSocket("response", err);
    res.status(500).json({
      status: false,
      message: "Gagal menghapus pesan!",
      error: err.message,
    });
  }
});

server.listen(port, function () {
  console.log("Menyiapkan Whatsapp...");
  console.log("Whatsapp BOT berjalan pada PORT: " + port);
});
