const axios = require('axios');
const { writeExifImg } = require('../libs/fuctions'); // Asegúrate de que esta función esté disponible

const handler = async (msg, { conn, text, args }) => {
  try {
    // Definir el JID objetivo:
    // Si se cita un mensaje, se usa el participant del mensaje citado; de lo contrario, el remitente.
    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant || (msg.key.participant || msg.key.remoteJid);

    // Intentar obtener el nombre del usuario usando conn.getName
    let targetName = "";
    if (typeof conn.getName === 'function') {
      targetName = await conn.getName(targetJid);
    }
    // Si no se obtuvo un nombre o es igual al JID, intenta obtenerlo de los contactos
    if (!targetName || targetName.trim() === "" || targetName === targetJid) {
      if (conn.contacts && conn.contacts[targetJid]) {
        targetName = conn.contacts[targetJid].notify || conn.contacts[targetJid].vname || conn.contacts[targetJid].name || "";
      }
    }
    // Si aún no hay un nombre válido, usar solo el número (parte antes de @)
    if (!targetName || targetName.trim() === "") {
      targetName = targetJid.split('@')[0];
    }

    // Obtener la foto de perfil (avatar) del usuario, con fallback por defecto
    const pp = await conn.profilePictureUrl(targetJid).catch(
      () => 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
    );

    // Obtener el contenido del texto (ya sea ingresado en args o mediante mensaje citado)
    let contenido = "";
    if (args.length > 0 && args.join(" ").trim() !== "") {
      contenido = args.join(" ").trim();
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
      contenido = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation.trim();
    } else {
      return await conn.sendMessage(msg.key.remoteJid, {
        text: "⚠️ Escribe una palabra o cita un mensaje."
      }, { quoted: msg });
    }

    // Remover posibles menciones del contenido
    const mentionRegex = new RegExp(
      `@${targetJid.split('@')[0].replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*`,
      'g'
    );
    const textoLimpio = contenido.replace(mentionRegex, "").trim();

    if (textoLimpio.length > 35) {
      return await conn.sendMessage(msg.key.remoteJid, {
        text: "⚠️ El texto no puede tener más de 35 caracteres."
      }, { quoted: msg });
    }

    // Construir la data para la generación del sticker con quote
    const quoteData = {
      type: "quote",
      format: "png",
      backgroundColor: "#000000",
      width: 600,
      height: 900,
      scale: 3,
      messages: [
        {
          entities: [],
          avatar: true,
          from: {
            id: 1,
            name: targetName,
            photo: { url: pp }
          },
          text: textoLimpio,
          replyMessage: {}
        }
      ]
    };

    // Enviar reacción mientras se genera el sticker
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: '🎨', key: msg.key }
    });

    const json = await axios.post('https://bot.lyo.su/quote/generate', quoteData, {
      headers: { 'Content-Type': 'application/json' }
    });

    const buffer = Buffer.from(json.data.result.image, 'base64');
    const sticker = await writeExifImg(buffer, {
      packname: "Azura Ultra 2.0 Bot",
      author: "𝙍𝙪𝙨𝙨𝙚𝙡𝙡 xz 💻"
    });

    await conn.sendMessage(msg.key.remoteJid, {
      sticker: { url: sticker }
    }, { quoted: msg });

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: '✅', key: msg.key }
    });

  } catch (err) {
    console.error("❌ Error en el comando qc:", err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ Ocurrió un error al generar el sticker."
    }, { quoted: msg });
  }
};

handler.command = ['qc'];
module.exports = handler;
