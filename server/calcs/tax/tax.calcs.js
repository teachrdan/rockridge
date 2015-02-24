// Income tax projection builder
'use strict';

var federal = require('../federal.variables');
var local = require('../local.variables');
// var calculate = require('./tax.util');

// Requires a plan object as a parameter
// Appends a taxProjection object to the plan and returns that same object.
module.exports.projection = function(plan) {
  // Define or reset plan.taxProjection to empty object before starting the calculations.
  plan.taxProjection = {};

  // Calculate projection results.
  var result = {};

  // The order of the following calculations must be preserved for the calculations to function properly. Edit with care.
  result.householdGross = (plan.grossAnnualIncome || 0) + (plan.spouseGrossAnnualIncome || 0);
  result.pretaxContributions = (plan.user401kContribution || 0) + (plan.spouse401kContribution || 0);
  result.agi = result.householdGross - result.pretaxContributions;

  // Deductions calculations
  result.deductions = {};
  // Standard deduction calcs
  result.deductions.standard = getVar(federal.deduction.standard);
  // Itemized deduction calcs
  result.deductions.itemized = {};
  // TODO: Refactor local taxes to account for living and working in different states.
  result.deductions.itemized.localTaxes = stateTax();
  // TODO: Add calculations and data for property tax estimates.
  result.deductions.itemized.propertyTaxes = 0000;
  result.deductions.itemized.mortgageInterest = mortgageInterest();
  result.deductions.itemized.miscDeduction = plan.otherDeductions; // This is just a user input right now
  result.deductions.maxApplicable = maxDeduction();

  // Exemption calcs
  result.exemptions = {};
  exemptionCalc();

  result.taxableIncome = result.agi - result.deductions.maxApplicable - result.exemptions.maxApplicable;

  // Tax calcs
  results.projected = {};
  // Federal/AMT and local taxes
  results.projected.federal = federalTax();
  results.projected.amt = amtCalc();
  results.projected.local = result.deductions.itemized.localTaxes;
  // FICA tax calcs
  results.projected.fica = {};
  results.projected.fica.ss = ssCalc();
  medicareCalc();

  plan.taxProjection = result;
  return result;

  // Helper functions

  // Get variable from federal variable module.
  function getVar(target) {
    if (!target) {
      console.log('ERROR: Imporper variable request for', target, 'from federal.variables.js');
      return null;
    }
    // Check to see if requested variable depends on marital status.
    if (target[plan.maritalStatus]) {
      return target[maritalStatus];
    } else {
      return target;
    }
  }

  // Calculate approximate property tax for primary residence.
  function propertyTax() {
    // TODO: Get info and write calculations for property tax (base off state average property tax for now).
  }

  // Calculate state income tax liability.
  function stateTax() {
    var agi = result.agi || ( ((plan.grossAnnualIncome || 0) + (plan.spouseGrossAnnualIncome || 0)) - ((plan.user401kContribution || 0) + (plan.spouse401kContribution || 0)) );
    var state = plan.residentState;
    return ( agi * getVar(local.stateIncomeTax(state)) );
    // TODO: Calculate state income tax marginally, rather than just by highest marginal.
  }

  // Calculate the portion of the current years' mortgage payment that is interest.
  function mortgageInterest() {
    var mortgage = plan.mortgage;
    // TODO: Calculate how much of the current years' mortgage payments are going towrds interest.
  }

  // Determine the user's maximum allowable deduction (greater between standard and itemized).
  function maxDeduction() {
    var itemizedDeductions = 0;
    for (var x in result.deductions.itemized) {
      itemizedDeductions += result.deductions.itemized[x];
    }
    // Calculations for itemized deduction phaseout.
    var agiOverLimit = Math.max( 0, result.agi - getVar(federal.deduction.phaseoutStart) );
    // Pease reduction floor for misc. deductions.
    var peaseFloor = result.agi > federal.deduction.phaseoutStart ? Math.min(plan.otherDeductions, 0.02 * result.agi), 0);
    var personalReduction = agiOverLimit * federal.deduction.itemizedReductionRate;
    var maxReduction = 0.8 * itemizedDeductions;
    var reducedItemizedDeductions = itemizedDeductions - peaseFloor - Math.min( personalReduction, maxReduction );

    return Math.max( result.deductions.standard, itemizedDeductions );
  }

  // Determine potential exemptions, reductions, and final exemption value.
  function exemptionCalc() {
    // Determine potential exemptions
    result.exemptions.claimed = getVar(federal.exemption.personal) * plan.dependents;

    // Calculate exemption reduction
    var agiOverLimit = Math.max( 0, result.agi - getVar(federal.exemption.phaseoutStart) );
    var exemptionReduction;
    if ( (result.agi - result.deductions.maxApplicable) > getVar(federal.exemption.phaseoutEnd) ) {
      exemptionReduction = 1;
    } else {
      exemptionReduction = Math.min( 1, Math.ceil(agiOverLimit/2500) * federal.exemption.phaseoutRate) );
    }
    result.exemptions.reductions = result.exemptions.claimed * exemptionReduction;

    // Calculate maximum applicable exemptions.
    result.exemptions.maxApplicable = (1 - exemptionReduction) * result.exemptions.claimed;
  }

  // Calculate the federal tax liability.
  function federalTax() {
    // calculations based off of result.taxableIncome
    // federal.bracketRate = [ 0.1, 0.15, 0.25, 0.28, 0.33, 0.35, 0.396 ];
    // federal.bracketLimit.single = [ 0, 9225, 37450,  90750, 189750, 411500, 413200 ];

    var bracketRate = getVar(federal.bracketRate);
    var bracketLimit = getVar(federal.bracketLimit);
    var income = result.taxableIncome;

    // Marginal tax calculations.
    var taxLiability = 0;
    for (var i=0; i<bracketRate.length; i++) {
      if (income >= bracketLimit[i] && i < bracketRate.length-1) {
        var temp = Math.min( bracketLimit[i+1], income ) - bracketLimit[i];
        taxLiability += (temp * bracketRate[i]);
      }
      // Catches cases where income is greater than the highest bracket.
      else if (income >= bracketLimit[i] && i === bracketRate.length-1) {
        var temp = income - bracketLimit[i];
        taxLiability += (temp * bracketRate[i]);
      }
    }
    return taxLiability;
  }

  // Calculations for Alternative Minimum Tax.
  function amtCalc() {
    var amtExemption = Math.max( 0, getVar(federal.amt.maxExemption) - ( getVar(federal.amt.exemptionReductionRate) * (result.agi - getVar(federal.amt.exemptionPhaseOut)) ) );
    var taxableIncome = result.agi - amtExemption;
    var maxAmtLiability = (federal.amt.minRate * Math.min(federal.amt.breakpoint, taxableincome))+(federal.amt.maxRate * Math.max(0, taxableincome - federal.amt.breakpoint));
    return Math.max(0, maxAmtLiability - results.projected.federal);
  }

  // Calculate the Social Security tax.
  function ssCalc() {
    var gross = result.householdGross || ( (plan.grossAnnualIncome || 0) + (plan.spouseGrossAnnualIncome || 0)) - ((plan.user401kContribution || 0) + (plan.spouse401kContribution || 0) );
    var taxable = Math.min( gross, federal.fica.ssWageBase );
    return ( taxable * federal.fica.ssTax );
  }

  // Calculate basic and additional medicare tax.
  function medicareCalc() {
    // Calculations for standard medicare tax.
    results.projected.fica.medicare = results.householdGross * federal.fica.medicareTax;

    // Calculationsfor additional medicare tax.
    var threshold = getVar(federal.fica.additionalMedicareLiability);
    if (results.householdGross > threshold) {
      results.projected.fica.addlMedicare = ( (results.householdGross - threshold) * federal.fica.additionalMedicareTax );
    } else {
      results.projected.fica.addlMedicare = 0;
    }
  }

};

/* This document should run all income tax projections and return an object with
   the results of all the tax calculations. The object should look like:

var taxResults = {
  deductions: {
    standard: num,
    itemized: {
      localTaxes: num,
      propertyTaxes: num,
      mortgageInterest: num,
      miscDeduction: num
    },
    maxApplicable: num
  },
  exemptions: {
    claimed: num,
    reductions: num,
    maxApplicable: num
  },
  projected: {
    federal: num,
    amt: num,
    local: num,
    fica: {
      ss: num,
      medicare: num,
      addlMedicare: num
    }
  }
};

*/