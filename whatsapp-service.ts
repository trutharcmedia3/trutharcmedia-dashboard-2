import * as Baileys from '@whiskeysockets/baileys';

// Extract functions with fallbacks
const useMultiFileAuthState = (Baileys as any).useMultiFileAuthState || (Baileys as any).default?.useMultiFileAuthState;
const fetchLatestBaileysVersion = (Baileys as any).fetchLatestBaileysVersion || (Baileys as any).default?.fetchLatestBaileysVersion;
const makeCacheableSignalKeyStore = (Baileys as any).makeCacheableSignalKeyStore || (Baileys as any).default?.makeCacheableSignalKeyStore;
const DisconnectReason = (Baileys as any).DisconnectReason || (Baileys as any).default?.DisconnectReason;
const makeWASocket = (Baileys as any).default || (Baileys as any).makeWASocket || Baileys;

import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const logger = pino({ level: 'silent' });
const SESSION_PATH = path.join(process.cwd(), '.wa_session');

interface WhatsAppSession {
  sock: any | null;
  qr: string | null;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  user: {
    id: string;
    name?: string;
  } | null;
}

class WhatsAppService {
  private session: WhatsAppSession = {
    sock: null,
    qr: null,
    status: 'disconnected',
    user: null
  };

  private cachedVersion: any = null;

  async init(forceFresh = false) {
    if (this.session.status === 'connected' || this.session.status === 'connecting') {
      return;
    }

    this.session.status = 'connecting';
    
    try {
      if (typeof useMultiFileAuthState !== 'function') {
        throw new Error(`useMultiFileAuthState is not a function (type: ${typeof useMultiFileAuthState})`);
      }

      // Only wipe session if explicitly requested or if we're starting fresh
      if (forceFresh && fs.existsSync(SESSION_PATH)) {
        try {
          fs.rmSync(SESSION_PATH, { recursive: true, force: true });
        } catch (rmError) {
          console.warn('Could not wipe session folder:', rmError);
        }
      }
      
      if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
      }

      let version = this.cachedVersion || [2, 3000, 1015901307]; 
      if (!this.cachedVersion) {
        try {
          const latest = await fetchLatestBaileysVersion();
          version = latest.version;
          this.cachedVersion = version;
        } catch (vErr) {
          console.warn('Failed to fetch latest Baileys version, using fallback:', vErr);
        }
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

      if (!makeWASocket) {
        throw new Error('makeWASocket is not defined');
      }

      const sock = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        browser: ['Truth Arc Media', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
      });

      this.session.sock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.session.qr = await QRCode.toDataURL(qr);
            this.session.status = 'qr_ready';
          } catch (qrErr) {
            console.error('Failed to generate QR DataURL:', qrErr);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          this.session.status = 'disconnected';
          this.session.qr = null;
          this.session.user = null;
          this.session.sock = null;

          if (shouldReconnect) {
            setTimeout(() => this.init(false), 5000);
          } else {
            this.wipeSession();
          }
        } else if (connection === 'open') {
          this.session.status = 'connected';
          this.session.qr = null;
          this.session.user = {
            id: sock.user?.id || '',
            name: sock.user?.name || ''
          };
        }
      });

    } catch (error) {
      console.error('WhatsApp Engine Critical Error:', error);
      this.session.status = 'disconnected';
      this.session.qr = null;
    }
  }

  getStatus() {
    return {
      status: this.session.status,
      qr: this.session.qr,
      user: this.session.user
    };
  }

  private wipeSession() {
    if (fs.existsSync(SESSION_PATH)) {
      try {
        fs.rmSync(SESSION_PATH, { recursive: true, force: true });
      } catch (err) {
        console.error('Failed to wipe session folder:', err);
      }
    }
  }

  async logout() {
    if (this.session.sock) {
      try {
        await this.session.sock.logout();
      } catch (e) {}
      this.session.sock = null;
    }
    this.wipeSession();
    this.session.status = 'disconnected';
    this.session.qr = null;
    this.session.user = null;
  }

  async sendMessage(to: string, text: string, image?: string) {
    if (this.session.status !== 'connected' || !this.session.sock) {
      throw new Error('WhatsApp not connected');
    }

    // Format number: remove +, spaces, etc.
    let cleaned = to.replace(/\D/g, '');
    
    // Handle Pakistan local format (e.g., 0321... -> 92321...)
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    }
    
    // Ensure it has a country code (if it's too short, it's likely invalid)
    if (cleaned.length < 10) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    const jid = cleaned + '@s.whatsapp.net';
    
    if (image) {
      // If image is a data URL, extract the base64 part
      const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
      const buffer = Buffer.from(base64Data, 'base64');
      
      await this.session.sock.sendMessage(jid, { 
        image: buffer,
        caption: text 
      });
    } else {
      await this.session.sock.sendMessage(jid, { text });
    }
  }
}

export const whatsappService = new WhatsAppService();
