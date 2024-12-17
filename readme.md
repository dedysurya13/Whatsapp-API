# Whatsapp API Tutorial

**This is the implementation example of <a href="https://github.com/pedroslopez/whatsapp-web.js">whatsapp-web.js</a>**

> [!IMPORTANT]
> **It is not guaranteed you will not be blocked by using this method. WhatsApp does not allow bots or unofficial clients on their platform, so this shouldn't be considered totally safe.**
> <br><br>**Please always use the latest version of** <a href="https://github.com/pedroslopez/whatsapp-web.js">**whatsapp-web.js**</a>.

> [!NOTE]
> **Node ``v18+`` is required.**

## How to use?
- Clone or download this repo
- Enter to the project directory
- Run `npm install`
- Run Whatsapp-API
  -  `node run start` for general use
  -  `node run start:dev` run with nodemon
  -  `node run start:auto` auto run when app crash (the error log will be in the error.log file)
- Open browser and go to address `http://localhost:8000`
- Scan the QR Code
- Enjoy!

## **Example usage**
### Send message
`http://localhost:8000/send-message`

**Paramaters:**
- `number`: the recipient number
- `message`: the message

### Send local media
`http://localhost:8000/send-media-local`

**Paramaters:**
- `number`: the recipient number
- `caption` (optional): file's caption

**Note:** Currently send-media-local sends files from a hard-coded path in app.js. You can change it if needed.

### Send uploaded media
`http://localhost:8000/send-media-upload`

**Paramaters:**
- `number`: the recipient number
- `file`: file's path
- `caption` (optional): file's caption
- `title` (optional): file's title/name

### Send media from link
`http://localhost:8000/send-media-link`

**Paramaters:**
- `number`: the recipient number
- `file`: file's url
- `caption` (optional): file's caption
- `title` (optional): file's title/name

### Send group message
`http://localhost:8000/send-group-message`

**Paramaters:**
- `id` (optional if name given): the chat ID
- `name` (optional): group name
- `message`: the message

**Note:** to get the groups info (including ID & name), send a message to the API number `!groups`. The API will replying with the groups info.

### Clear Message
Clear your message from your device.\n
`http://localhost:8000/clear-message`

**Paramaters:**
- `number`: the recipient number

### Delete Message
You can delete your own message from recipient Whatsapp.\n
`http://localhost:8000/delete-message`

**Paramaters:**
- `number`: the recipient number
- `limit` (optional): limit latest message that you can delete (default is 1)
- `everyone` (optional): delete for everyone (default is true; true: delete for everyone, false: delete for me)

**Limitation**
- You can only delete 1 (one) message per request. If you set limit more than 1, the API will remove the oldest messages from the limit filter.
- You can only delete messages if they have not exceeded the WhatsApp deletion time limit.
