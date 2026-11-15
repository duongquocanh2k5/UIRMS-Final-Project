/**
 * Validation Utilities
 * Input validation functions
 */

import { REGEX_PATTERNS } from '../config/constants';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return REGEX_PATTERNS.EMAIL.test(email);
}

/**
 * Validate Vietnamese phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  return REGEX_PATTERNS.VIETNAMESE_PHONE.test(phone);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return REGEX_PATTERNS.PASSWORD.test(password);
}

/**
 * Validate Vietnamese citizen identity number (CMND/CCCD)
 */
export function isValidIdentityNumber(identityNumber: string): boolean {
  return REGEX_PATTERNS.CMND_CCCD.test(identityNumber);
}

/**
 * Official Ministry of Public Security (C06) 3-digit province/city codes for 12-digit CCCD
 */
export const VN_CCCD_PROVINCE_CODES: Record<string, string> = {
  '001': 'Hà Nội',
  '002': 'Hà Giang',
  '004': 'Cao Bằng',
  '006': 'Bắc Kạn',
  '008': 'Tuyên Quang',
  '010': 'Lào Cai',
  '011': 'Điện Biên',
  '012': 'Lai Châu',
  '014': 'Sơn La',
  '015': 'Yên Bái',
  '017': 'Hòa Bình',
  '019': 'Thái Nguyên',
  '020': 'Lạng Sơn',
  '022': 'Quảng Ninh',
  '024': 'Bắc Giang',
  '025': 'Phú Thọ',
  '026': 'Vĩnh Phúc',
  '027': 'Bắc Ninh',
  '030': 'Hải Dương',
  '031': 'Hải Phòng',
  '033': 'Hưng Yên',
  '034': 'Thái Bình',
  '035': 'Hà Nam',
  '036': 'Nam Định',
  '037': 'Ninh Bình',
  '038': 'Thanh Hóa',
  '040': 'Nghệ An',
  '042': 'Hà Tĩnh',
  '044': 'Quảng Bình',
  '045': 'Quảng Trị',
  '046': 'Thừa Thiên Huế',
  '048': 'Đà Nẵng',
  '049': 'Quảng Nam',
  '051': 'Quảng Ngãi',
  '052': 'Bình Định',
  '054': 'Phú Yên',
  '056': 'Khánh Hòa',
  '058': 'Ninh Thuận',
  '060': 'Bình Thuận',
  '062': 'Kon Tum',
  '064': 'Gia Lai',
  '066': 'Đắk Lắk',
  '067': 'Đắk Nông',
  '068': 'Lâm Đồng',
  '070': 'Bình Phước',
  '072': 'Tây Ninh',
  '074': 'Bình Dương',
  '075': 'Đồng Nai',
  '077': 'Bà Rịa - Vũng Tàu',
  '079': 'TP. Hồ Chí Minh',
  '080': 'Long An',
  '082': 'Tiền Giang',
  '083': 'Bến Tre',
  '084': 'Trà Vinh',
  '086': 'Vĩnh Long',
  '087': 'Đồng Tháp',
  '089': 'An Giang',
  '091': 'Kiên Giang',
  '092': 'Cần Thơ',
  '093': 'Hậu Giang',
  '094': 'Sóc Trăng',
  '095': 'Bạc Liêu',
  '096': 'Cà Mau',
};

export interface ParsedCCCDInfo {
  valid: boolean;
  error?: string;
  provinceCode?: string;
  provinceName?: string;
  gender?: 'Nam' | 'Nữ';
  birthYear?: number;
  randomSerial?: string;
}

/**
 * Validate and decode 12-digit Vietnamese Chip-based CCCD according to C06 standard
 */
export function parseAndValidateCCCD(cccd: string): ParsedCCCDInfo {
  const clean = (cccd || '').trim();
  if (!/^\d{12}$/.test(clean)) {
    return {
      valid: false,
      error: 'Số định danh cá nhân (CCCD gắn chip) phải gồm đúng 12 chữ số.',
    };
  }

  const provinceCode = clean.slice(0, 3);
  const centuryGenderDigit = Number(clean.slice(3, 4));
  const birthYearTwoDigits = Number(clean.slice(4, 6));
  const randomSerial = clean.slice(6, 12);

  const provinceName = VN_CCCD_PROVINCE_CODES[provinceCode];
  if (!provinceName) {
    return {
      valid: false,
      error: `Mã tỉnh/thành phố "${provinceCode}" (3 số đầu CCCD) không tồn tại trong hệ thống C06 Bộ Công an.`,
    };
  }

  // Century & gender code: 0/1 -> 20th century (1900-1999), 2/3 -> 21st century (2000-2099)
  if (![0, 1, 2, 3].includes(centuryGenderDigit)) {
    return {
      valid: false,
      error: `Mã thế kỷ & giới tính (chữ số thứ 4: "${centuryGenderDigit}") không hợp lệ theo chuẩn CCCD.`,
    };
  }

  const baseCentury = centuryGenderDigit <= 1 ? 1900 : 2000;
  const birthYear = baseCentury + birthYearTwoDigits;
  const currentYear = new Date().getFullYear();

  if (birthYear < 1910 || birthYear > currentYear - 14) {
    return {
      valid: false,
      error: `Năm sinh giải mã từ CCCD (${birthYear}) không hợp lệ để cấp định danh VNeID Mức 2 (yêu cầu từ 14 tuổi trở lên).`,
    };
  }

  if (/^(\d)\1{5}$/.test(randomSerial)) {
    return {
      valid: false,
      error: '6 chữ số cuối của CCCD không hợp lệ (dãy số lặp giả mạo).',
    };
  }

  const gender: 'Nam' | 'Nữ' = centuryGenderDigit % 2 === 0 ? 'Nam' : 'Nữ';

  return {
    valid: true,
    provinceCode,
    provinceName,
    gender,
    birthYear,
    randomSerial,
  };
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize string input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: any,
  limit?: any
): { page: number; limit: number } {
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

  return { page: parsedPage, limit: parsedLimit };
}
