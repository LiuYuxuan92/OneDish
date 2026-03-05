import { StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../styles/theme';

export const weeklyPlanStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  headerDate: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.md,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius['3xl'],
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  generateButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
  },
  todayCard: {
    margin: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.primary.light,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.main,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  todayIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  todayTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary.dark,
  },
  todaySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  planSection: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary.main,
    borderStyle: 'dashed',
  },
  regenerateButtonDisabled: {
    opacity: 0.6,
  },
  regenerateIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  regenerateText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary.main,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.functional.error,
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  // 信息提示卡片
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.functional.infoLight,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.functional.info,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.functional.info,
    lineHeight: 20,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.background.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.primary.main,
    fontWeight: Typography.fontWeight.semibold,
  },
});
