import React from 'react';
import { StyleSheet, View } from 'react-native';

type TrafficSignType = 'road' | 'light' | 'water' | 'drain' | 'waste' | 'tree' | 'elevator' | 'safety' | 'generic';

interface TrafficSignIconProps {
  categoryName: string;
  size?: number;
}

function getTrafficSignType(categoryName: string): TrafficSignType {
  const name = categoryName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

  if (/rac|waste|trash/.test(name)) return 'waste';
  if (/thang may|elevator|lift/.test(name)) return 'elevator';
  if (/an toan|safety/.test(name)) return 'safety';
  if (/cong|thoat nuoc|drain/.test(name)) return 'drain';
  if (/ngap|nuoc|flood/.test(name)) return 'water';
  if (/den|dien|light|electric/.test(name)) return 'light';
  if (/cay|tree/.test(name)) return 'tree';
  if (/duong|o ga|road|pothole|traffic/.test(name)) return 'road';
  return 'generic';
}

export default function TrafficSignIcon({ categoryName, size = 48 }: TrafficSignIconProps) {
  const type = getTrafficSignType(categoryName);
  const scale = size / 56;
  const scaled = (value: number) => value * scale;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <View
        style={[
          styles.triangle,
          {
            borderLeftWidth: scaled(28),
            borderRightWidth: scaled(28),
            borderBottomWidth: scaled(49),
            borderBottomColor: '#E5483F',
          },
        ]}
      />
      <View
        style={[
          styles.triangle,
          {
            left: scaled(5),
            top: scaled(5),
            borderLeftWidth: scaled(23),
            borderRightWidth: scaled(23),
            borderBottomWidth: scaled(40),
            borderBottomColor: '#FFD83D',
          },
        ]}
      />
      <View style={[styles.symbol, { left: scaled(9), top: scaled(24), width: scaled(38), height: scaled(18) }]}>
        {type === 'road' && (
          <>
            <View style={[styles.roadBase, { width: scaled(31), height: scaled(5), top: scaled(9) }]} />
            <View style={[styles.roadBump, { width: scaled(12), height: scaled(8), top: scaled(5) }]} />
          </>
        )}
        {type === 'light' && (
          <>
            <View style={[styles.lightPole, { height: scaled(15), left: scaled(18), top: scaled(2) }]} />
            <View style={[styles.lightArm, { width: scaled(12), left: scaled(18), top: scaled(2) }]} />
            <View style={[styles.lightBulb, { left: scaled(27), top: scaled(3), width: scaled(5), height: scaled(4) }]} />
          </>
        )}
        {type === 'water' && (
          <>
            <View style={[styles.wave, { width: scaled(25), left: scaled(6), top: scaled(4) }]} />
            <View style={[styles.wave, { width: scaled(31), left: scaled(3), top: scaled(9) }]} />
            <View style={[styles.wave, { width: scaled(25), left: scaled(6), top: scaled(14) }]} />
          </>
        )}
        {type === 'drain' && (
          <>
            <View style={[styles.drainBase, { width: scaled(27), height: scaled(3), left: scaled(5), top: scaled(7) }]} />
            <View style={[styles.drainSlot, { left: scaled(10), top: scaled(5) }]} />
            <View style={[styles.drainSlot, { left: scaled(17), top: scaled(5) }]} />
            <View style={[styles.drainSlot, { left: scaled(24), top: scaled(5) }]} />
          </>
        )}
        {type === 'waste' && (
          <>
            <View style={[styles.binLid, { width: scaled(15), left: scaled(12), top: scaled(3) }]} />
            <View style={[styles.binBody, { width: scaled(12), height: scaled(11), left: scaled(14), top: scaled(6) }]} />
            <View style={[styles.binHandle, { left: scaled(17), top: scaled(1) }]} />
          </>
        )}
        {type === 'tree' && (
          <>
            <View style={[styles.treeTop, { width: scaled(13), height: scaled(10), left: scaled(12), top: scaled(2) }]} />
            <View style={[styles.treeTop, { width: scaled(13), height: scaled(10), left: scaled(21), top: scaled(2) }]} />
            <View style={[styles.treeTrunk, { height: scaled(8), left: scaled(20), top: scaled(9) }]} />
          </>
        )}
        {type === 'elevator' && (
          <>
            <View style={[styles.elevatorCabin, { width: scaled(15), height: scaled(17), left: scaled(11), top: scaled(1) }]} />
            <View style={[styles.elevatorDoor, { height: scaled(13), left: scaled(18), top: scaled(3) }]} />
            <View style={[styles.elevatorArrow, { left: scaled(3), top: scaled(5) }]} />
            <View style={[styles.elevatorArrow, styles.elevatorArrowDown, { left: scaled(29), top: scaled(10) }]} />
          </>
        )}
        {type === 'safety' && (
          <>
            <View style={[styles.safetyPersonHead, { width: scaled(6), height: scaled(6), left: scaled(16), top: scaled(1) }]} />
            <View style={[styles.safetyPersonBody, { width: scaled(4), height: scaled(11), left: scaled(17), top: scaled(8) }]} />
            <View style={[styles.safetyPersonArm, { width: scaled(15), left: scaled(11), top: scaled(11) }]} />
            <View style={[styles.safetyPersonLeg, { width: scaled(14), left: scaled(12), top: scaled(17) }]} />
          </>
        )}
        {type === 'generic' && (
          <>
            <View style={[styles.exclamationBar, { height: scaled(10), left: scaled(18), top: scaled(2) }]} />
            <View style={[styles.exclamationDot, { left: scaled(17), top: scaled(14), width: scaled(4), height: scaled(4) }]} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  triangle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  symbol: {
    position: 'absolute',
    alignItems: 'center',
  },
  roadBase: { position: 'absolute', left: 3, backgroundColor: '#20252A', borderRadius: 2 },
  roadBump: { position: 'absolute', left: 13, backgroundColor: '#20252A', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  lightPole: { position: 'absolute', width: 2, backgroundColor: '#20252A' },
  lightArm: { position: 'absolute', height: 2, backgroundColor: '#20252A' },
  lightBulb: { position: 'absolute', backgroundColor: '#20252A', borderRadius: 3 },
  wave: { position: 'absolute', height: 2, backgroundColor: '#20252A', borderRadius: 2 },
  drainBase: { position: 'absolute', backgroundColor: '#20252A' },
  drainSlot: { position: 'absolute', width: 2, height: 7, backgroundColor: '#20252A' },
  binLid: { position: 'absolute', height: 2, backgroundColor: '#20252A', borderRadius: 2 },
  binBody: { position: 'absolute', borderWidth: 2, borderColor: '#20252A', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  binHandle: { position: 'absolute', width: 5, height: 2, backgroundColor: '#20252A' },
  treeTop: { position: 'absolute', backgroundColor: '#20252A', borderRadius: 8 },
  treeTrunk: { position: 'absolute', width: 3, backgroundColor: '#20252A' },
  elevatorCabin: { position: 'absolute', borderWidth: 2, borderColor: '#20252A', borderRadius: 2 },
  elevatorDoor: { position: 'absolute', width: 1, backgroundColor: '#20252A' },
  elevatorArrow: { position: 'absolute', width: 2, height: 7, backgroundColor: '#20252A' },
  elevatorArrowDown: { transform: [{ rotate: '180deg' }] },
  safetyPersonHead: { position: 'absolute', backgroundColor: '#20252A', borderRadius: 4 },
  safetyPersonBody: { position: 'absolute', backgroundColor: '#20252A', borderRadius: 2 },
  safetyPersonArm: { position: 'absolute', height: 2, backgroundColor: '#20252A' },
  safetyPersonLeg: { position: 'absolute', height: 2, backgroundColor: '#20252A' },
  exclamationBar: { position: 'absolute', width: 3, backgroundColor: '#20252A', borderRadius: 2 },
  exclamationDot: { position: 'absolute', backgroundColor: '#20252A', borderRadius: 3 },
});
