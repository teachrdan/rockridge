var yodlee = require('./yodleeSample');
// var yodleeTransCats = require('yodleeTransactionCategories');

// This is an array with objects representing each transaction
yodlee = yodlee.searchResult.transactions;

var accountSums = [];

for (var i = 0; i < yodlee.length; i++) {
	var item = yodlee[i];
	for (var key in item) {
		if (key === 'account') {
			var currBal = item.account.accountBalance.amount;
			accountSums.push(currBal);
		}
	}
}

console.log('accountSums', accountSums);
