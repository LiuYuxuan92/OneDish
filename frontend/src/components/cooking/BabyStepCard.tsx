import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { TimelinePhase } from '../../types';
import {
  getTextureForAge, TEXTURE_LABELS, getAgeAdaptation, checkAllergyRisk
} from '../../constants/babyAgeRules';

interface BabyStepCardProps {
  phase: TimelinePhase;
  babyAgeMonths: number;
  ingredients?: string[];
}

export function BabyStepCard({ phase, babyAgeMonths, ingredients = [] }: BabyStepCardProps) {
  const [scienceModalVisible, setScienceModalVisible] = useState(false);
  const [dismissedRisks, setDismissedRisks] = useState<Set<string>>(new Set());

  const textureLevel = getTextureForAge(babyAgeMonths);
  const textureLabel = TEXTURE_LABELS[textureLevel];
  const ageAdaptation = getAgeAdaptation(babyAgeMonths);

  const allergyRisks = ingredients
    .map((ingredient) => {
      const rule = checkAllergyRisk(ingredient, babyAgeMonths);
      return rule ? { ingredient, rule } : null;
    })
    .filter((item): item is { ingredient: string; rule: NonNullable<ReturnType<typeof checkAllergyRisk>> } =>
      item !== null && !dismissedRisks.has(item!.ingredient)
    );

  const handleDismissRisk = (ingredient: string) => {
    setDismissedRisks((prev) => new Set(prev).add(ingredient));
  };

  return (
    <View style={styles.card}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <Text style={styles.titleIcon}>🍼</Text>
        <Text style={styles.titleText}>宝宝专属</Text>
        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>{babyAgeMonths}个月</Text>
        </View>
      </View>

      {/* Step content */}
      <Text style={styles.stepText}>{phase.action}</Text>

      {/* Age adaptation */}
      <View style={styles.adaptationRow}>
        <Text style={styles.adaptationIcon}>⚠️</Text>
        <Text style={styles.adaptationText}>{ageAdaptation}</Text>
      </View>

      {/* Texture suggestion */}
      <View style={styles.textureRow}>
        <Text style={styles.textureLabel}>质地建议：</Text>
        <Text style={styles.textureValue}>{textureLabel}</Text>
      </View>

      {/* Science button */}
      <TouchableOpacity
        style={styles.scienceButton}
        onPress={() => setScienceModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.scienceButtonText}>📖 为什么这样做？</Text>
      </TouchableOpacity>

      {/* Allergy risk cards */}
      {allergyRisks.map(({ ingredient, rule }) => (
        <View key={ingredient} style={[styles.allergyCard, rule.risk === 'high' ? styles.allergyCardHigh : styles.allergyCardMedium]}>
          <Text style={styles.allergyTitle}>
            {rule.risk === 'high' ? '🚨' : '⚠️'} 过敏风险提示：{ingredient}
          </Text>
          <Text style={styles.allergyNote}>{rule.note}</Text>
          <TouchableOpacity
            style={styles.allergyDismissButton}
            onPress={() => handleDismissRisk(ingredient)}
            activeOpacity={0.7}
          >
            <Text style={styles.allergyDismissText}>已了解，继续</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Science Modal */}
      <Modal
        visible={scienceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScienceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>📖 科学依据</Text>
              <Text style={styles.modalBody}>{ageAdaptation}</Text>
              <Text style={styles.modalExplanation}>
                根据世界卫生组织（WHO）和中国营养学会的婴幼儿喂养指南，宝宝的消化系统和咀嚼能力随月龄逐步发育。适合月龄的食物质地和大小能有效降低噎呛风险，同时帮助宝宝发展口腔运动能力和对不同食物质地的接受度。循序渐进地引入不同质地的食物，是促进宝宝健康饮食习惯的关键步骤。
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setScienceModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>明白了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FCE4EC',
    borderWidth: 1.5,
    borderColor: '#E91E63',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#880E4F',
    marginRight: 8,
  },
  ageBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E91E63',
  },
  ageBadgeText: {
    fontSize: 13,
    color: '#E91E63',
    fontWeight: '600',
  },
  stepText: {
    fontSize: 22,
    color: '#212121',
    lineHeight: 32,
    marginBottom: 12,
    fontWeight: '500',
  },
  adaptationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 10,
  },
  adaptationIcon: {
    fontSize: 16,
    marginRight: 6,
    marginTop: 1,
  },
  adaptationText: {
    fontSize: 14,
    color: '#5D4037',
    flex: 1,
    lineHeight: 20,
  },
  textureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  textureLabel: {
    fontSize: 14,
    color: '#880E4F',
    fontWeight: '600',
  },
  textureValue: {
    fontSize: 14,
    color: '#424242',
  },
  scienceButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E91E63',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  scienceButtonText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600',
  },
  allergyCard: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  allergyCardHigh: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  allergyCardMedium: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  allergyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  allergyNote: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
    marginBottom: 10,
  },
  allergyDismissButton: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  allergyDismissText: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    color: '#E91E63',
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  modalExplanation: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 22,
    marginBottom: 16,
  },
  modalCloseButton: {
    backgroundColor: '#E91E63',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
