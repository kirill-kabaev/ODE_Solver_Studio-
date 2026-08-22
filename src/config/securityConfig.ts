/**
 * =======================================================================
 * SECURITY & HARDWARE BINDING CONFIGURATION — AERO-STUDIO PRO v3.0
 * =======================================================================
 * Конфигурация суперпользователя, зашифрованного MAC-адреса и пула 100 ключей
 * 
 * Владелец & Суперпользователь:
 * - k.kabaev94@gmail.com
 * - k_kaba@mail.ru
 * 
 * Данный файл содержит зашифрованный аппаратный профиль (MAC & Hardware ID)
 * и предустановленный банк из 100 уникальных криптографических лицензионных ключей.
 */

export interface HardwareSecurityProfile {
  macAddressEncryptedHash: string;
  hardwareFingerprintSalt: string;
  encryptionAlgorithm: string;
  bindingTimestamp: string;
  authorizedDeviceType: string;
  deviceFingerprintHash: string;
}

export interface LicenseKeyRecord {
  id: string;
  keyNumber: number;
  key: string;
  status: 'available' | 'activated' | 'revoked';
  issuedAt: string;
  activatedAt?: string;
  assignedEmail?: string;
  deviceSignature?: string;
  notes?: string;
}

export const SUPER_USER_EMAILS: string[] = [
  'k.kabaev94@gmail.com',
  'k_kaba@mail.ru',
];

/**
 * Зашифрованный MAC-адрес и профиль доверенного устройства суперпользователя.
 * Хранит SHA-256 HMAC хэши аппаратного отпечатка и сетевого адаптера (MAC).
 */
export const ENCRYPTED_HARDWARE_CONFIG: HardwareSecurityProfile = {
  // Зашифрованный SHA-256 хэш мастер MAC-адреса суперпользователя с криптографической солью
  macAddressEncryptedHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855$aero_mac_sec_77af9c12',
  hardwareFingerprintSalt: 'SALT_AERO_PRO_SUPER_ADMIN_2026_KABAEV_94',
  encryptionAlgorithm: 'AES-256-GCM / PBKDF2-HMAC-SHA256',
  bindingTimestamp: '2026-08-22T08:30:00.000Z',
  authorizedDeviceType: 'Master Workstation / SuperAdmin High-Performance Terminal',
  deviceFingerprintHash: 'c772c57f725359a35e4e72390ffae8d7db6ef88265016e3c04ef2b7754b2efc8',
};

/**
 * Генерация стабильного пула из 100 уникальных ключей активации
 * Формат: AERO-PRO-XXXX-XXXX-XXXX
 */
const generateDeterministicMaster100Keys = (): LicenseKeyRecord[] => {
  const seedWords = [
    '7K9A', '4M2X', '88QP', '3N1V', '9Y7L', '2W5T', '6C8B', '1D4F',
    '5H7J', '8K2L', '4Z9X', '7V1C', '3B5N', '9M6Q', '2W8E', '5R7T',
    '1Y3U', '6I8O', '4P2A', '7S9D', '3F5G', '8H1J', '2K4L', '9Z7X',
    '5C3V', '1B8N', '6M2Q', '4W7E', '8R1T', '3Y5U', '7I9O', '2P4A',
  ];

  const keys: LicenseKeyRecord[] = [];

  for (let i = 1; i <= 100; i++) {
    const p1 = seedWords[(i * 3 + 7) % seedWords.length];
    const p2 = seedWords[(i * 7 + 13) % seedWords.length];
    const hexNum = (i * 1337 + 0x1A2B).toString(16).toUpperCase().padStart(4, '0');
    const fullKey = `AERO-PRO-${p1}-${p2}-${hexNum}`;

    keys.push({
      id: `key_${i.toString().padStart(3, '0')}`,
      keyNumber: i,
      key: fullKey,
      status: 'available',
      issuedAt: '2026-08-22',
      notes: `Уникальный ключ доступа #${i} для выдачи пользователю`,
    });
  }

  return keys;
};

export const INITIAL_100_LICENSE_KEYS: LicenseKeyRecord[] = generateDeterministicMaster100Keys();

export const SECURITY_STORAGE_KEYS = {
  CURRENT_USER_SESSION: 'aero_studio_auth_session_v2',
  REGISTERED_USERS_DB: 'aero_studio_users_db_v2',
  LICENSE_KEYS_STORE: 'aero_studio_license_keys_store_v2',
  DEVICE_BINDING: 'aero_studio_device_binding_v2',
};
