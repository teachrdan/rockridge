var config = require('../../config/config')
var nexmo = require('easynexmo');
// https://github.com/pvela/nexmo
nexmo.initialize(config.nexmo.id, config.nexmo.secret,'http', false);

var Nexmo = function() {};

//Note: from and to must have a leading 1 for country code
Nexmo.prototype.sendText = function(to, text, cb) {
  nexmo.sendTextMessage(12069396508, to, text, {}, function(err, res){
    if(err) throw err;
    cb(res);
  });
};

// var test = new Nexmo();
// test.sendText(15553337777, 12228883333, 'it worked!', function(res){
//   console.log('res', res);
// });


module.exports = Nexmo;
