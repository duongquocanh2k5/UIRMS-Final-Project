import { Linking, Platform } from 'react-native';

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

export interface DecodedCCCD {
  valid: boolean;
  errorVi?: string;
  errorEn?: string;
  provinceCode?: string;
  provinceName?: string;
  genderVi?: 'Nam' | 'Nữ';
  genderEn?: 'Male' | 'Female';
  birthYear?: number;
}

/**
 * Decode and validate 12-digit Vietnamese Chip-based CCCD according to C06 rules
 */
export function decodeVietnameseCCCD(cccd: string): DecodedCCCD {
  const clean = (cccd || '').trim();
  if (!/^\d{12}$/.test(clean)) {
    return {
      valid: false,
      errorVi: 'Số định danh cá nhân (CCCD gắn chip) phải gồm đúng 12 chữ số.',
      errorEn: 'Vietnamese Chip-based Citizen ID (CCCD) must be exactly 12 digits.',
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
      errorVi: `Mã tỉnh/thành phố "${provinceCode}" (3 số đầu) không hợp lệ theo chuẩn C06 Bộ Công an.`,
      errorEn: `Province code "${provinceCode}" (first 3 digits) is invalid under C06 standard.`,
    };
  }

  if (![0, 1, 2, 3].includes(centuryGenderDigit)) {
    return {
      valid: false,
      errorVi: `Mã thế kỷ & giới tính (số thứ 4: "${centuryGenderDigit}") không hợp lệ.`,
      errorEn: `Century & gender code (4th digit: "${centuryGenderDigit}") is invalid.`,
    };
  }

  const baseCentury = centuryGenderDigit <= 1 ? 1900 : 2000;
  const birthYear = baseCentury + birthYearTwoDigits;
  const currentYear = new Date().getFullYear();

  if (birthYear < 1910 || birthYear > currentYear - 14) {
    return {
      valid: false,
      errorVi: `Năm sinh giải mã (${birthYear}) không đủ điều kiện cấp định danh VNeID Mức 2 (tối thiểu 14 tuổi).`,
      errorEn: `Decoded birth year (${birthYear}) is not eligible for Level 2 VNeID (minimum age 14).`,
    };
  }

  if (/^(\d)\1{5}$/.test(randomSerial)) {
    return {
      valid: false,
      errorVi: '6 chữ số định danh cuối không hợp lệ (dãy số lặp giả mạo).',
      errorEn: 'Last 6 serial digits are invalid (repeated sequence).',
    };
  }

  const isMale = centuryGenderDigit % 2 === 0;
  return {
    valid: true,
    provinceCode,
    provinceName,
    genderVi: isMale ? 'Nam' : 'Nữ',
    genderEn: isMale ? 'Male' : 'Female',
    birthYear,
  };
}

/**
 * Open official VNeID mobile application or official portal
 */
export async function openOfficialVNeIDApp(): Promise<void> {
  const deepLink = 'vneid://';
  const fallbackUrl =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/vn/app/vneid/id1582750372'
      : Platform.OS === 'android'
        ? 'https://play.google.com/store/apps/details?id=com.vnid'
        : 'https://vneid.gov.vn';

  try {
    if (Platform.OS !== 'web') {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
        return;
      }
    }
    await Linking.openURL(fallbackUrl);
  } catch {
    await Linking.openURL('https://vneid.gov.vn');
  }
}
