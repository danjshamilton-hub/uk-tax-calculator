// Benefits and Childcare Thresholds for 2025/26

export const benefitsThresholds = {
  // Child Benefit High Income Charge
  childBenefit: {
    taperStart: 60000,
    taperEnd: 80000,
    annualBenefitFirstChild: 1248, // £24 per week
    annualBenefitAdditionalChild: 828, // £15.90 per week
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
