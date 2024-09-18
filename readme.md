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
- Run `node start.js`
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
