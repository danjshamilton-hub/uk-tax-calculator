// Benefits and Childcare Thresholds for 2025/26

export const benefitsThresholds = {
  // Child Benefit High Income Charge
  childBenefit: {
    taperStart: 60000,
    taperEnd: 80000,
    annualBenefitFirstChild: 1354.6, // £26.05 per week (2025/26)
    annualBenefitAdditionalChild: 897, // £17.25 per week (2025/26)
  },

  // Tax-Free Childcare
  taxFreeChildcare: {
    threshold: 100000,
    governmentContributionPerChild: 2000, // annual
  },

  // 30 Hours Free Childcare (England only)
  freeChildcare30Hours: {
    threshold: 100000,
    englandOnly: true,
  },
};
