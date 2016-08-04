'use strict';

var path = require('path');
var NODE_MODULES = Object.keys(require(path.join(process.cwd(),'package.json'))['dependencies']);

exports.clearFileCache = function(file){
  let mod = require.cache[file];
  if(!mod){
    return;
  }

  if(mod && mod.children){
    mod.children.length = 0;
  }

  // 遍历所有模块，删除子模块为mod的模块
  // 在这里之所以没有仅仅针对mod.parent进行删除mod元素，是由于
  // node的module模块实现的关系。当前node的module模块中的Module._load
  // 实现中，如果该模块被第二个父模块所引用，那么该子模块不会被放入第二个父模块
  // 的children数组中，仅仅被第一个父模块所引用。因此，在这里使用最可靠的遍历排除内存泄漏的隐患
  for(let fileItem in require.cache){
    if(fileItem === file || fileItem.indexOf(NODE_MODULES) > -1){
      continue;
    }
    let item = require.cache[fileItem];
    if(item && item.children && item.children.indexOf(mod) > -1){
    //  this.clearFileCache(fileItem);
      item.children.splice(item.children.indexOf(mod), 1);
    }
  }

  //remove require cache
  delete require.cache[file];
};