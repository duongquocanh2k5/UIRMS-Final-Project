import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type UrbanCategoryType =
  | 'road'
  | 'light'
  | 'water'
  | 'drain'
  | 'waste'
  | 'tree'
  | 'traffic'
  | 'safety'
  | 'elevator'
  | 'sidewalk'
  | 'signal'
  | 'pollution'
  | 'cable'
  | 'fire'
  | 'other';

export interface CategoryVisualConfig {
  type: UrbanCategoryType;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badgeBg: string;
  innerBg: string;
  borderColor: string;
}

const VISUAL_MAP: Record<UrbanCategoryType, CategoryVisualConfig> = {
  road: {
    type: 'road',
    icon: 'construct',
    iconColor: '#DC2626',
    badgeBg: '#FEF2F2',
    innerBg: '#FEE2E2',
    borderColor: '#FECACA',
  },
  light: {
    type: 'light',
    icon: 'bulb',
    iconColor: '#D97706',
    badgeBg: '#FFFBEB',
    innerBg: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  water: {
    type: 'water',
    icon: 'water',
    iconColor: '#0284C7',
    badgeBg: '#F0F9FF',
    innerBg: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  drain: {
    type: 'drain',
    icon: 'funnel',
    iconColor: '#0D9488',
    badgeBg: '#F0FDFA',
    innerBg: '#CCFBF1',
    borderColor: '#99F6E4',
  },
  waste: {
    type: 'waste',
    icon: 'trash',
    iconColor: '#16A34A',
    badgeBg: '#F0FDF4',
    innerBg: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  tree: {
    type: 'tree',
    icon: 'leaf',
    iconColor: '#15803D',
    badgeBg: '#ECFDF5',
    innerBg: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  traffic: {
    type: 'traffic',
    icon: 'bicycle',
    iconColor: '#EA580C',
    badgeBg: '#FFF7ED',
    innerBg: '#FFEDD5',
    borderColor: '#FED7AA',
  },
  safety: {
    type: 'safety',
    icon: 'shield-checkmark',
    iconColor: '#E11D48',
    badgeBg: '#FFF1F2',
    innerBg: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  elevator: {
    type: 'elevator',
    icon: 'business',
    iconColor: '#4F46E5',
    badgeBg: '#EEF2FF',
    innerBg: '#E0E7FF',
    borderColor: '#C7D2FE',
  },
  sidewalk: {
    type: 'sidewalk',
    icon: 'walk',
    iconColor: '#B45309',
    badgeBg: '#FFFBEB',
    innerBg: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  signal: {
    type: 'signal',
    icon: 'trail-sign',
    iconColor: '#2563EB',
    badgeBg: '#EFF6FF',
    innerBg: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  pollution: {
    type: 'pollution',
    icon: 'volume-high',
    iconColor: '#DB2777',
    badgeBg: '#FDF2F8',
    innerBg: '#FCE7F3',
    borderColor: '#FBCFE8',
  },
  cable: {
    type: 'cable',
    icon: 'git-network',
    iconColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    innerBg: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  fire: {
    type: 'fire',
    icon: 'flame',
    iconColor: '#DC2626',
    badgeBg: '#FEF2F2',
    innerBg: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  other: {
    type: 'other',
    icon: 'grid',
    iconColor: '#475569',
    badgeBg: '#F8FAFC',
    innerBg: '#E2E8F0',
    borderColor: '#CBD5E1',
  },
};

export function detectUrbanCategoryType(rawName?: string | null): UrbanCategoryType {
  if (!rawName) return 'other';
  const name = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();

  if (/chay|lua|cuu hoa|fire|emergency|explosion/.test(name)) return 'fire';
  if (/day cap|cap vien thong|day dien vong|wiring|cable|telecom/.test(name)) return 'cable';
  if (/tieng on|on ao|khoi bui|o nhiem|noise|pollution|air|smoke/.test(name)) return 'pollution';
  if (/bien bao|tin hieu|den giao thong|vach ke|signal|sign/.test(name)) return 'signal';
  if (/via he|lan chiem|long duong|sidewalk|encroachment|pavement/.test(name)) return 'sidewalk';
  if (/ngap|nuoc thai|nuoc ngap|ong nuoc|flood|flooding|wastewater/.test(name)) return 'water';
  if (/cong tac|cong ranh|nap cong|mieng cong|ho ga|thoat nuoc|clogged drain|drain|manhole|sewer/.test(name)) return 'drain';
  if (/tac duong|ket xe|un tac|traffic congestion|congestion|traffic jam/.test(name)) return 'traffic';
  if (/rac|ve sinh|xa ban|waste|litter|trash|garbage/.test(name)) return 'waste';
  if (/thang may|tien ich|nha cho|elevator|lift|facility/.test(name)) return 'elevator';
  if (/an toan|an ninh|nguy hiem|public safety|safety|security/.test(name)) return 'safety';
  if (/den duong|mat dien|den bi hu|chieu sang|streetlight|power|electric/.test(name)) return 'light';
  if (/cay|canh cay|cong vien|tree|branch|park/.test(name)) return 'tree';
  if (/duong hong|o ga|sut lun|mat duong|road|pothole/.test(name)) return 'road';
  return 'other';
}

const CATEGORY_SORT_RANK: Record<UrbanCategoryType, number> = {
  road: 1,
  light: 2,
  water: 3,
  drain: 4,
  waste: 5,
  tree: 6,
  traffic: 7,
  safety: 8,
  sidewalk: 9,
  signal: 10,
  pollution: 11,
  cable: 12,
  fire: 13,
  elevator: 14,
  other: 99,
};

export function sortUrbanCategories<T extends { name?: string; label?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const typeA = detectUrbanCategoryType(a.name || a.label);
    const typeB = detectUrbanCategoryType(b.name || b.label);
    return (CATEGORY_SORT_RANK[typeA] ?? 50) - (CATEGORY_SORT_RANK[typeB] ?? 50);
  });
}

export function getCategoryVisualConfig(categoryName?: string | null): CategoryVisualConfig {
  const type = detectUrbanCategoryType(categoryName);
  return VISUAL_MAP[type];
}

interface TrafficSignIconProps {
  categoryName?: string | null;
  size?: number;
}

export default function TrafficSignIcon({ categoryName, size = 44 }: TrafficSignIconProps) {
  const config = getCategoryVisualConfig(categoryName);
  const outerSize = size;
  const innerSize = Math.round(size * 0.78);
  const iconSize = Math.max(16, Math.round(size * 0.48));
  const outerRadius = Math.round(outerSize * 0.32);
  const innerRadius = Math.round(innerSize * 0.3);

  const renderSymbol = () => {
    // 1. Ùn tắc giao thông: Hình nhiều chiếc xe máy (Multiple Motorbikes)
    if (config.type === 'traffic') {
      const backBikeSize = Math.max(11, Math.round(size * 0.31));
      const frontBikeSize = Math.max(15, Math.round(size * 0.41));
      return (
        <View style={{ width: innerSize, height: innerSize, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons
            name="motorbike"
            size={backBikeSize}
            color="#FB923C"
            style={{
              position: 'absolute',
              top: Math.round(innerSize * 0.12),
              left: Math.round(innerSize * 0.1),
              opacity: 0.85,
            }}
          />
          <MaterialCommunityIcons
            name="motorbike"
            size={backBikeSize}
            color="#F97316"
            style={{
              position: 'absolute',
              top: Math.round(innerSize * 0.14),
              right: Math.round(innerSize * 0.08),
              opacity: 0.9,
            }}
          />
          <MaterialCommunityIcons
            name="motorbike"
            size={frontBikeSize}
            color={config.iconColor}
            style={{
              marginTop: Math.round(innerSize * 0.22),
            }}
          />
        </View>
      );
    }

    // 2. Ngập nước & Nước thải: Hình giọt nước có mũi tên đi lên (Water drop + Rising arrow)
    if (config.type === 'water') {
      const dropSize = Math.max(15, Math.round(size * 0.44));
      const arrowSize = Math.max(11, Math.round(size * 0.3));
      return (
        <View style={{ width: innerSize, height: innerSize, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons
            name="water"
            size={dropSize}
            color={config.iconColor}
            style={{ marginRight: Math.round(innerSize * 0.14), marginTop: Math.round(innerSize * 0.06) }}
          />
          <View
            style={[
              styles.waterArrowBadge,
              {
                right: Math.round(innerSize * 0.08),
                top: Math.round(innerSize * 0.12),
                borderColor: config.innerBg,
              },
            ]}
          >
            <MaterialCommunityIcons name="arrow-up-bold" size={arrowSize} color="#0369A1" />
          </View>
        </View>
      );
    }

    return <Ionicons name={config.icon} size={iconSize} color={config.iconColor} />;
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.outerBadge,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerRadius,
          backgroundColor: config.badgeBg,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View
        style={[
          styles.innerCircle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerRadius,
            backgroundColor: config.innerBg,
          },
        ]}
      >
        {renderSymbol()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterArrowBadge: {
    position: 'absolute',
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
