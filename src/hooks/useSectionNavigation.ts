/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SectionConfig } from '../lib/questionsData';

/**
 * Hook to manage section navigation within the diagnostic questionnaire.
 */
export function useSectionNavigation(applicableSections: SectionConfig[]) {
  const [activeSectionCode, setActiveSectionCode] = useState<string>(() => {
    return applicableSections[0]?.code || 'A';
  });

  // Ensure activeSectionCode belongs to applicable sections
  useEffect(() => {
    if (applicableSections.length > 0 && !applicableSections.some((s) => s.code === activeSectionCode)) {
      setActiveSectionCode(applicableSections[0].code);
    }
  }, [applicableSections, activeSectionCode]);

  const currentSectionIndex = useMemo(() => {
    return applicableSections.findIndex((s) => s.code === activeSectionCode);
  }, [applicableSections, activeSectionCode]);

  const prevSection = useMemo(() => {
    return currentSectionIndex > 0 ? applicableSections[currentSectionIndex - 1] : null;
  }, [applicableSections, currentSectionIndex]);

  const nextSection = useMemo(() => {
    return currentSectionIndex >= 0 && currentSectionIndex < applicableSections.length - 1
      ? applicableSections[currentSectionIndex + 1]
      : null;
  }, [applicableSections, currentSectionIndex]);

  const goToPrevSection = useCallback(() => {
    if (prevSection) {
      setActiveSectionCode(prevSection.code);
    }
  }, [prevSection]);

  const goToNextSection = useCallback(() => {
    if (nextSection) {
      setActiveSectionCode(nextSection.code);
    }
  }, [nextSection]);

  return {
    activeSectionCode,
    setActiveSectionCode,
    currentSectionIndex,
    prevSection,
    nextSection,
    goToPrevSection,
    goToNextSection,
  };
}
