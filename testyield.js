/**
 * Created by showjoy on 16/6/12.
 */
function* abc(){
  var a, b,c;
  a = yield 123;
  console.log(a);
  b = yield p();
  console.log(b);
  c = yield [function(){
    return 'cd';
  },function(){
    return 'bf';
  }];
  console.log(c);
}

function p(){
  var prom = new Promise(function(res,rej){
    process.nextTick(function(){
    //  console.log('next tick happens!');
      res('res next tick happens!')
    });
  });
  return prom;
}

var gen = abc();
var v1 = gen.next();
var v2 = gen.next(v1.value);
var v3 = gen.next();
gen.next(v3.value);