var Readable = require('stream').Readable;
var inherits = require('util').inherits;

inherits(View, Readable);

function View(context) {
  Readable.call(this, {});
}

View.prototype._read = function (){};

View.prototype.end = function(data){
  this.push(data);
  this.push(null);
};

exports.View = View;