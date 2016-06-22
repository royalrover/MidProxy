var fs = require('fs');
var path = require('path');
async function abc(...arg){
  await process.nextTick(function(){console.log(333)},arg);
  var content = await fs.readFile('package.json','utf8');
  console.log(content);
}

abc(500)
