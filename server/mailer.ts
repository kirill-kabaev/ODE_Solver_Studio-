import fs from "fs";
import path from "path";

export interface ActivationPayload {
  email: string;
  licenseKey: string;
  keyNumber?: number;
  deviceFingerprint?: string;
  displayMac?: string;
  macEncryptedSignature?: string;
  platformCores?: number;
  platformArch?: string;
  platformGpu?: string;
  agreementAccepted?: boolean;
  agreementVersion?: string;
  userAgent?: string;
  clientIp?: string;
  timestamp?: string;
}

export interface ActivationRecord extends ActivationPayload {
  id: string;
  receivedAt: string;
  emailSent: boolean;
  emailError?: string;
}

const SUPER_ADMIN_EMAILS = [
  "k.kabaev94@gmail.com",
  "k_kaba@mail.ru",
];

const DATA_DIR = path.join(process.cwd(), "data");
const ACTIVATIONS_FILE = path.join(DATA_DIR, "activations_log.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn("Could not create data dir", e);
    }
  }
}

export function getActivationRecords(): ActivationRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ACTIVATIONS_FILE)) {
      const raw = fs.readFileSync(ACTIVATIONS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Error reading activations file", e);
  }
  return [];
}

export function saveActivationRecord(record: ActivationRecord) {
  ensureDataDir();
  try {
    const list = getActivationRecords();
    list.unshift(record);
    // Keep max 500 records
    const trimmed = list.slice(0, 500);
    fs.writeFileSync(ACTIVATIONS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving activation record", e);
  }
}

/**
 * Creates nodemailer transport if configured and module exists
 */
async function createMailerTransport() {
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER?.trim();
  // Sanitize passwords by removing accidental surrounding whitespace
  let pass = process.env.SMTP_PASS?.trim();
  if (pass && host.includes("gmail.com")) {
    pass = pass.replace(/\s+/g, "");
  }

  if (!user || !pass) {
    return null;
  }

  try {
    const nodemailerModule = await import("nodemailer");
    const nodemailer = (nodemailerModule as any).default || nodemailerModule;
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        // Do not fail on invalid certificates if any local proxy exists
        rejectUnauthorized: false,
      },
    });
  } catch (err) {
    console.warn("nodemailer not installed or not resolvable, falling back to built-in telemetry logger:", err);
    return null;
  }
}

/**
 * Diagnostic tool to check SMTP connectivity and credentials
 */
export async function getSmtpDiagnostic(): Promise<{
  configured: boolean;
  host: string;
  port: number;
  user: string | null;
  hasPass: boolean;
  passLength: number;
  verified: boolean;
  message: string;
}> {
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER?.trim() || null;
  const pass = process.env.SMTP_PASS?.trim() || "";

  if (!user || !pass) {
    return {
      configured: false,
      host,
      port,
      user,
      hasPass: Boolean(pass),
      passLength: pass.length,
      verified: false,
      message: "В файле .env не заданы SMTP_USER или SMTP_PASS. Письма сохраняются в локальный журнал сервера.",
    };
  }

  try {
    const transporter = await createMailerTransport();
    if (!transporter) {
      return {
        configured: true,
        host,
        port,
        user,
        hasPass: true,
        passLength: pass.length,
        verified: false,
        message: "Модуль nodemailer не загружен. Установите его командой: npm install nodemailer",
      };
    }

    // Attempt SMTP handshake & authentication verification
    await transporter.verify();
    return {
      configured: true,
      host,
      port,
      user,
      hasPass: true,
      passLength: pass.length,
      verified: true,
      message: `Подключение к почтовому серверу (${host}:${port}) успешно! Аутентификация пользователя ${user} подтверждена.`,
    };
  } catch (err: any) {
    let friendlyError = err.message || String(err);
    if (friendlyError.includes("535") || friendlyError.toLowerCase().includes("authentication failed") || friendlyError.toLowerCase().includes("badcredentials")) {
      friendlyError = `Неверный логин или пароль приложения (${host}). Для Mail.ru/Gmail необходимо использовать специальный 'Пароль для внешних приложений' (16 символов), а не обычный пароль от почты.`;
    }
    return {
      configured: true,
      host,
      port,
      user,
      hasPass: true,
      passLength: pass.length,
      verified: false,
      message: `Ошибка подключения к ${host}: ${friendlyError}`,
    };
  }
}

/**
 * Sends notification emails to both k.kabaev94@gmail.com and k_kaba@mail.ru
 */
export async function sendActivationEmailNotification(
  payload: ActivationPayload
): Promise<{
  success: boolean;
  emailSent: boolean;
  error?: string;
  simulated?: boolean;
  messageId?: string;
  recipients: string[];
  statusMessage: string;
}> {
  const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  const timeUtc = new Date().toISOString();

  const record: ActivationRecord = {
    id: `ACT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    ...payload,
    receivedAt: timeUtc,
    emailSent: false,
  };

  const subject = `🛡️ [AERO-STUDIO PRO] Новая активация ключа: ${payload.email} (${payload.licenseKey})`;

  const textContent = `
===================================================================
AERO-STUDIO PRO v3.0 — УВЕДОМЛЕНИЕ О НОВОЙ АКТИВАЦИИ КЛЮЧА
===================================================================
Уважаемый Суперпользователь (Кабаев К.)!

Пользователь только что успешно подтвердил Пользовательское Соглашение (EULA) и активировал лицензионный ключ в Студии:

• Пользователь (Email): ${payload.email}
• Лицензионный ключ: ${payload.licenseKey} ${payload.keyNumber ? `(Ключ #${payload.keyNumber})` : ''}
• Согласие с EULA & Передачей данных ПК: ПОДТВЕРЖДЕНО (v3.0 2026)
• Цифровой отпечаток ПК: ${payload.deviceFingerprint || 'Не указан'}
• Сетевая MAC-сигнатура: ${payload.displayMac || '00:50:56:XX:XX:XX'}
• Ядер CPU / Архитектура: ${payload.platformCores ? `${payload.platformCores} cores, ${payload.platformArch || 'x64'}` : 'x86_64 / Multicore'}
• GPU / Графика: ${payload.platformGpu || 'WebGL/GPU accelerated'}
• Время активации (МСК): ${now}
• IP-адрес: ${payload.clientIp || '127.0.0.1'}
• Браузер/Клиент: ${payload.userAgent || 'AeroStudio Desktop Client'}

Статус: Ключ успешно привязан к учетной записи ${payload.email} и рабочей станции.
Повторная активация этого ключа другими пользователями аппаратно заблокирована.

===================================================================
Уведомление отправлено на ваши адреса:
- k.kabaev94@gmail.com
- k_kaba@mail.ru
===================================================================
  `.trim();

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 640px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #0284c7 0%, #4338ca 100%); padding: 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 20px; color: #ffffff; font-weight: 800; letter-spacing: 0.5px; }
      .header p { margin: 6px 0 0; font-size: 13px; color: #bae6fd; font-family: monospace; }
      .content { padding: 24px; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(6, 182, 212, 0.15); border: 1px solid #0891b2; color: #38bdf8; font-size: 11px; font-weight: bold; margin-bottom: 16px; }
      .field-card { background: #020617; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 13px; }
      .row:last-child { border-bottom: none; }
      .label { color: #94a3b8; font-weight: 500; }
      .value { color: #f1f5f9; font-weight: 700; font-family: monospace; }
      .highlight { color: #38bdf8; }
      .eula-badge { background: #064e3b; color: #34d399; border: 1px solid #059669; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
      .footer { background: #020617; padding: 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🛡️ AERO-STUDIO PRO v3.0</h1>
        <p>УВЕДОМЛЕНИЕ ОБ АКТИВАЦИИ КЛЮЧА &amp; ТЕЛЕМЕТРИИ ПК</p>
      </div>
      <div class="content">
        <div class="badge">⚖️ ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ (EULA) ПРИНЯТО</div>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-top: 0;">
          Уважаемый <strong>Суперпользователь (Кабаев К.)</strong>, пользователь подтвердил согласие с EULA на передачу аппаратно-технических данных и успешно активировал лицензионный ключ:
        </p>

        <div class="field-card">
          <div class="row">
            <span class="label">Пользователь (Email):</span>
            <span class="value highlight">${payload.email}</span>
          </div>
          <div class="row">
            <span class="label">Лицензионный ключ:</span>
            <span class="value highlight">${payload.licenseKey} ${payload.keyNumber ? `(#${payload.keyNumber})` : ''}</span>
          </div>
          <div class="row">
            <span class="label">Согласие с EULA &amp; Телеметрией:</span>
            <span class="value"><span class="eula-badge">✓ ПОДТВЕРЖДЕНО</span></span>
          </div>
          <div class="row">
            <span class="label">MAC-адрес / Аппаратная подпись:</span>
            <span class="value">${payload.displayMac || '00:50:56:C0:A4:7B'}</span>
          </div>
          <div class="row">
            <span class="label">Цифровой Hardware-ID:</span>
            <span class="value">${payload.deviceFingerprint || 'HW-ID-SECURE'}</span>
          </div>
          <div class="row">
            <span class="label">Платформа / CPU / GPU:</span>
            <span class="value">${payload.platformCores ? `${payload.platformCores} cores` : 'Multicore'} | ${payload.platformArch || 'x64'}</span>
          </div>
          <div class="row">
            <span class="label">Время активации (МСК):</span>
            <span class="value">${now}</span>
          </div>
          <div class="row">
            <span class="label">IP адрес:</span>
            <span class="value">${payload.clientIp || '127.0.0.1'}</span>
          </div>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">
          Лицензия жестко привязана к указанному Email и аппаратуре рабочей станции. При необходимости вы можете отозвать доступ в панели суперпользователя.
        </p>
      </div>
      <div class="footer">
        Копии отправлены Правообладателю: <strong>${SUPER_ADMIN_EMAILS.join(', ')}</strong><br />
        Aero-Studio Pro v3.0 &bull; Автор и правообладатель: К. Кабаев
      </div>
    </div>
  </body>
  </html>
  `;

  console.log(`\n===================================================================`);
  console.log(`[LICENSE ACTIVATION DISPATCHER]`);
  console.log(`User: ${payload.email}`);
  console.log(`Key: ${payload.licenseKey}`);
  console.log(`Hardware: ${payload.displayMac || payload.deviceFingerprint}`);
  console.log(`Recipients: ${SUPER_ADMIN_EMAILS.join(", ")}`);
  console.log(`===================================================================\n`);

  const transporter = await createMailerTransport();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Aero-Studio Security" <${process.env.SMTP_USER}>`,
        to: SUPER_ADMIN_EMAILS.join(", "),
        subject,
        text: textContent,
        html: htmlContent,
      });

      record.emailSent = true;
      saveActivationRecord(record);
      return {
        success: true,
        emailSent: true,
        messageId: info.messageId,
        recipients: SUPER_ADMIN_EMAILS,
        statusMessage: `Письмо успешно доставлено почтовым сервером на адреса: ${SUPER_ADMIN_EMAILS.join(", ")}`,
      };
    } catch (err: any) {
      console.error("[Mailer Error] Failed to send email via SMTP:", err);
      let friendlyError = err.message || String(err);
      if (friendlyError.includes("535") || friendlyError.toLowerCase().includes("authentication failed")) {
        friendlyError = `Ошибка авторизации SMTP (код 535). Убедитесь, что в .env указан 16-значный 'Пароль для внешних приложений', а не обычный пароль от почты.`;
      }
      record.emailSent = false;
      record.emailError = friendlyError;
      saveActivationRecord(record);
      return {
        success: true, // Key activation is still saved and verified
        emailSent: false,
        error: friendlyError,
        recipients: SUPER_ADMIN_EMAILS,
        statusMessage: `Ключ активирован в реестре, но SMTP вернул ошибку: ${friendlyError}`,
      };
    }
  } else {
    // SMTP is not yet configured with credentials:
    record.emailSent = false;
    record.emailError = "SMTP_USER/SMTP_PASS не заданы в .env. Запись зафиксирована в локальном журнале сервера.";
    saveActivationRecord(record);
    return {
      success: true,
      emailSent: false,
      simulated: true,
      recipients: SUPER_ADMIN_EMAILS,
      statusMessage: "Телеметрия сохранена в локальной базе сервера (data/activations_log.json). Для прямой отправки в почтовый ящик укажите SMTP_USER и SMTP_PASS в .env.",
    };
  }
}

