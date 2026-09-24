import type { DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';
import type { WizardStep } from '../sdtooling-view.types';

export const buildWizardSteps = (
  sections: DynamicSection[],
  labels: { summary: string; summaryDesc: string; fillSection: (section: string) => string },
): WizardStep[] => {
  if (!sections.length) {
    return [];
  }

  const sectionSteps = sections.map(section => ({
    key: section.key,
    label: section.label,
    description: section.description || labels.fillSection(section.label),
  }));

  return [
    ...sectionSteps,
    {
      key: 'summary',
      label: labels.summary,
      description: labels.summaryDesc,
    },
  ];
};

export const isSummaryStepIndex = (sectionsLength: number, currentStepIndex: number): boolean => {
  return sectionsLength > 0 && currentStepIndex === sectionsLength;
};

export const getActiveSectionAtStep = (
  sections: DynamicSection[],
  currentStepIndex: number,
): DynamicSection | undefined => {
  if (isSummaryStepIndex(sections.length, currentStepIndex)) {
    return undefined;
  }
  return sections[currentStepIndex];
};
