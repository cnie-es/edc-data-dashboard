import type { DynamicSection } from '@eclipse-edc/dashboard-core/shacl-schema';

export const isAssetPropertiesSection = (section: DynamicSection): boolean => {
  const normalizedKey = section.key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedLabel = section.label.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalizedKey.includes('assetproperties') || normalizedLabel.includes('assetproperties');
};

export const hasAssetPropertiesSection = (sections: DynamicSection[]): boolean => {
  return sections.some(section => isAssetPropertiesSection(section));
};
