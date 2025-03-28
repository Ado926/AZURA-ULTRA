const axios = require('axios');
const { writeExifImg } = require('../libs/fuctions'); // Asegúrate de tener esta función

const handler = async (msg, { conn, text, args }) => {
  try {
    // Verificar si hay mensaje citado
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    // Si se cita a alguien, ese será el objetivo; de lo contrario, el remitente
    const targetJid = quotedJid || senderJid;

    // Obtener el nombre del usuario objetivo
    let targetName;
    if (quotedJid) {
      if (typeof conn.getName === 'function') {
        targetName = await conn.getName(quotedJid);
      } else if (conn.contacts && conn.contacts[quotedJid]) {
        targetName = conn.contacts[quotedJid].notify || conn.contacts[quotedJid].vname || conn.contacts[quotedJid].name || quotedJid;
      } else {
        targetName = quotedJid;
      }
    } else {
      targetName = msg.pushName || "";
    }
    // Fallback: si no hay nombre o es vacío o "Sin nombre", usar el número
    if (!targetName || targetName.trim() === "" || targetName === "Sin nombre") {
      targetName = targetJid.split('@')[0];
    }

    // Obtener avatar del usuario objetivo con fallback
    const pp = await conn.profilePictureUrl(targetJid).catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png');

    // Validar entrada: texto ingresado en args o mensaje citado
    let contenido = "";
    if (args.length > 0 && args.join(" ").trim() !== "") {
      contenido = args.join(" ").trim();
    } else if (quotedMsg && quotedMsg.conversation) {
      contenido = quotedMsg.conversation.trim();
    } else {
      return await conn.sendMessage(msg.key.remoteJid, {
        text: "⚠️ Escribe una palabra o cita un mensaje."
      }, { quoted: msg });
    }

    // Remover posibles menciones del contenido
    const mentionRegex = new RegExp(`@${targetJid.split('@')[0].replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*`, 'g');
    const textoLimpio = contenido.replace(mentionRegex, "").trim();

    if (textoLimpio.length > 35) {
      return await conn.sendMessage(msg.key.remoteJid, {
        text: "⚠️ El texto no puede tener más de 35 caracteres."
      }, { quoted: msg });
    }

    // Construir la data para el quote con dimensiones aumentadas para que el avatar y el texto se muestren más grandes
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

    // Reacción mientras se genera el sticker
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
