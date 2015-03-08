// Controller for overview view within my-plan.

'use strict';

angular.module('rockridge')
.controller('OverviewViewCtrl', function($scope, Nexmo) {


  $scope.linkBankAccount = function(){
    $('#cap-one-modal').modal('show');
    //TODO:
  };

  $scope.textPlan = function(){
    var number = $('#phone-number').val();
    number = parseInt('1'+number);
    var body = {
      to: number,
      message: 'rockridge.io - Click to open your plan: https://rockridge.io/dashboard'
    }
    Nexmo.text(body);
  };

  // Calculates and return the total of a given group.
  var sumGroup = function(group) {
    var total = 0;
    for (var key in group) {
      if (typeof group[key] === 'number') total += group[key];
      else total += group[key]['value'] || group[key]['balance'];
    }
    return total;
  }

  // Net Worth Chart Logic
  // http://www.highcharts.com/demo/pie-drilldown
  var fixedAssets = sumGroup($scope.plan.assets.fixed);
  var variableAssets = sumGroup($scope.plan.assets.variable);
  var personalAssets = sumGroup($scope.plan.assets.personal);
  var mortgages = $scope.plan.mortgage.currentBalance;
  var studentLoans = sumGroup($scope.plan.debts.studentLoans);
  var creditCards = sumGroup($scope.plan.debts.creditCards);
  var otherDebts = sumGroup($scope.plan.debts.other);

  // Create the chart
  $('#netWorthContainer').highcharts({
    chart: {
      type: 'column'
    },
    title: {
      text: 'Net Worth Snapshot'
    },
    subtitle: {
      text: 'click any asset or debt in the legend to add or remove it from the graph'
    },
    xAxis: {
      categories: [ 'Assets', 'Debts' ]
    },
    yAxis: {
      allowDecimals: false,
      min: 0,
      title: {
        text: 'Amount'
      }
    },
    tooltip: {
      formatter: function () {
        return '<b>' + this.x + '</b><br/>' +
          this.series.name + ': ' + this.y + '<br/>' +
          'Total: ' + this.point.stackTotal;
      }
    },
    plotOptions: {
      column: {
        stacking: 'normal'
      }
    },
    series: [{
      name: 'Fixed Assets',
      data: [ fixedAssets, 0 ]
    }, {
      name: 'Variable Assets',
      data: [ variableAssets, 0 ]
    }, {
      name: 'Personal Assets',
      data: [ personalAssets, 0 ]
    }, {
      name: 'Mortgage',
      data: [ 0, mortgages ]
    }, {
      name: 'Student Loans',
      data: [ 0, studentLoans ]
    }, {
      name: 'Credit Cards',
      data: [ 0, creditCards ]
    }, {
      name: 'Other Debt',
      data: [ 0, otherDebts ]
    }]
  });
  // hide highcharts.com logo
  $('text[text-anchor=end]').hide();


  // Budget Chart Logic
  var fixedExpenses = sumGroup($scope.plan.fixedExpenses);
  var flexibleExpenses = sumGroup($scope.plan.flexibleExpenses);
  var savings = ($scope.plan.spouse401kContribution + $scope.plan.user401kContribution) / 12;
  var totalCashFlowOut = fixedExpenses + flexibleExpenses + savings;
  // http://www.highcharts.com/demo/pie-drilldown
  var topLevelSlices = {
    'fixed expenses': null,
    'flexible expenses': null,
    'savings': null
  };
  var sliceData = [{
    drilldown: 'Fixed Expenses',
    name: 'Fixed Expenses',
    visible: true,
    y: (fixedExpenses / totalCashFlowOut) * 100
  }, {
    drilldown: 'Flexible Expenses',
    name: 'Flexible Expenses',
    visible: true,
    y: (flexibleExpenses / totalCashFlowOut) * 100
  }, {
    drilldown: 'Savings',
    name: 'Long-Term Savings',
    visible: true,
    y: (savings / totalCashFlowOut) * 100
  }];
  var drillDownSlices = [{
    name: 'Fixed Expenses',
    id: 'Fixed Expenses',
    data: [ 20, 60, 20]
  }, {
    name: 'Flexible Expenses',
    id: 'Flexible Expenses',
    data: [ 25, 50, 25]
  }, {
    name: 'Long-Term Savings',
    id: 'Savings',
    data: [ 10, 70, 20]
  }];

  // Create the chart
  $('#budgetContainer').highcharts({
    chart: {
      type: 'pie'
    },
    title: {
      text: 'Budget Breakdown'
    },
    subtitle: {
      text: 'click each section to see a detailed breakdown'
    },
    plotOptions: {
      series: {
        dataLabels: {
          enabled: true,
          format: '{point.name}'
        }
      }
    },
    tooltip: {
      enabled: true,
      pointFormat: '<b>{point.percentage:.1f}%</b>'
    },
    series: [{
      name: 'top',
      colorByPoint: true,
      data: sliceData
    }],
    drilldown: {
      series: drillDownSlices
    }
  });
  // hide highcharts.com logo
  $('text[text-anchor=end]').hide();


  // Retirement Chart Logic
  var ranges = [];
  var averages = [];

  // Calculate user age for start point.
  function calculateAge(birthday) { // birthday is a date
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }
  var start = calculateAge($scope.plan.birthdate);

  // Populate rage and averages
  // TODO: Use the actual numbers once the calculations are complete.
  var stdev;
  for (var i=0; i<(120-start); i++) {
    averages.push([
      i,
      (variableAssets * (i*0.08)) + savings
    ]);
    stdev = ((120-i)/(i+1));
    ranges.push([
      i,
      averages[i][1] - (stdev * averages[i][1]),
      averages[i][1] + (stdev * averages[i][1])
    ]);
  }
  // End placeholder retirement calculations

  $('#retirementContainer').highcharts({
    title: {
      text: 'Retirement Savings Projection'
    },
    xAxis: {
      type: 'number',
      title: {
        text: 'Age'
      }
    },
    yAxis: {
      title: {
        text: 'Total Savings'
      }
    },
    tooltip: {
      crosshairs: true,
      shared: true
    },
    series: [{
      name: 'Projected Savings',
      data: averages,
      zIndex: 1,
      marker: {
        fillColor: 'white',
        lineWidth: 2,
        lineColor: Highcharts.getOptions().colors[0]
      }
    }, {
      name: 'Standard Deviation',
      data: ranges,
      type: 'arearange',
      lineWidth: 0,
      linkedTo: ':previous',
      color: Highcharts.getOptions().colors[0],
      fillOpacity: 0.3,
      zIndex: 0
    }]
  });
  // hide highcharts.com logo
  $('text[text-anchor=end]').hide();

  // Tax Chart Logic
  // Build the chart
  $('#taxContainer').highcharts({
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false
    },
    title: {
      text: 'Income Tax Analysis'
    },
    subtitle: {
      text: 'click any asset or debt in the legend to add or remove it from the graph'
    },
    tooltip: {
      pointFormat: '<b>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
            enabled: true
        },
        showInLegend: true
      }
    },
    series: [{
      type: 'pie',
      data: [
        [ 'Federal', $scope.plan.taxProjection.projected.federal ],
        [ 'State and City', $scope.plan.taxProjection.projected.local ],
        [ 'FICA', sumGroup($scope.plan.taxProjection.projected.fica) ],
        [ 'AMT', $scope.plan.taxProjection.projected.amt ],
        [ 'Net Income', $scope.plan.taxProjection.netIncome + $scope.plan.spouse401kContribution + $scope.plan.user401kContribution ]
      ]
    }]
  });
  // hide highcharts.com logo
  $('text[text-anchor=end]').hide();

});
