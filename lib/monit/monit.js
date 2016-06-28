var multimeter = require('multimeter');
var os         = require('os');
var p          = require('path');
var fs         = require('fs');
var chalk      = require('chalk');

// Cst for light programs
const RATIO_T1   = Math.floor(os.totalmem() / 500);
// Cst for medium programs
const RATIO_T2   = Math.floor(os.totalmem() / 50);
// Cst for heavy programs
const RATIO_T3   = Math.floor(os.totalmem() / 5);
// Cst for heavy programs
const RATIO_T4   = Math.floor(os.totalmem());

var Monit = {};

//helper to get bars.length (num bars printed)
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

/**
 * Reset the monitor through charm, basically \033c
 * @param  String msg optional message to show
 * @return Monit
 */
Monit.reset = function(msg) {

  this.multi.charm.reset();
  this.multi.write('\x1B[32m⌬ MidProxy \x1B[39mmonitoring\x1B[96m  \x1B[39m\n\n');

  if(msg) {
    this.multi.write(msg);
  }

  this.bars = {};

  return this;
}

/**
 * Synchronous Monitor init method
 * @method init
 * @return Monit
 */
Monit.init = function() {

  this.multi = multimeter(process);

  this.multi.on('^C', this.stop);

  this.reset();

  return this;
}

/**
 * Stops monitor
 * @method stop
 */
Monit.stop = function() {
  this.multi.charm.destroy();
  process.exit(0);
}


/**
 * Refresh monitor
 * @method refresh
 * @param {} processes
 * @return this
 */
Monit.refresh = function(processes) {

  if(!processes) {
    processes = [];
  }

  var num = processes.length;
  this.num_bars = Object.size(this.bars);

  if(num !== this.num_bars) {
    return this.addProcesses(processes);
  } else {

    if(num === 0) {
      return;
    }

    var proc;

    for(var i = 0; i < num; i++) {
      proc = processes[i];

      //this is to avoid a print issue when the process is restarted for example
      //we might also check for the pid but restarted|restarting will be rendered bad
      if(this.bars[proc.pm_id] && proc.pm2_env.status !== this.bars[proc.pm_id].status) {
        this.addProcesses(processes);
        break;
      }

      this.updateBars(proc);

    }
  }

  return this;
}

Monit.addProcess = function(proc, i) {
  if(proc.pid in this.bars) {
    return ;
  }

  if (proc.monit.error)
    throw new Error(JSON.stringify(proc.monit.error));

  this.multi.write(' ● MidProxy Instance\n');
  this.multi.write('[' + proc.pid + '] \n');

  var bar_cpu = this.multi(40, (i * 2) + 3 + i, {
    width: 30,
    solid: {
      text: '|',
      foreground: 'white',
      background: 'blue'
    },
    empty: {
      text: ' '
    }
  });

  var bar_memory = this.multi(40, (i * 2) + 4 + i, {
    width: 30,
    solid: {
      text: '|',
      foreground: 'white',
      background: 'red'
    },
    empty: {
      text: ' '
    }
  });

  this.bars[proc.pid] = {
    memory: bar_memory,
    cpu: bar_cpu
  };

  this.updateBars(proc);

  this.multi.write('\n');

  return this;
}

Monit.addProcesses = function(processes) {

  if(!processes) {
    processes = [];
  }

  this.reset();

  var num = processes.length;

  if(num > 0) {
    for(var i = 0; i < num; i++) {
      this.addProcess(processes[i], i);
    }
  } else {
    this.reset('No processes to monit');
  }

}

var bytesToSize = function(bytes, precision) {
  var kilobyte = 1024;
  var megabyte = kilobyte * 1024;
  var gigabyte = megabyte * 1024;
  var terabyte = gigabyte * 1024;

  if ((bytes >= 0) && (bytes < kilobyte)) {
    return bytes + ' B   ';
  } else if ((bytes >= kilobyte) && (bytes < megabyte)) {
    return (bytes / kilobyte).toFixed(precision) + ' KB  ';
  } else if ((bytes >= megabyte) && (bytes < gigabyte)) {
    return (bytes / megabyte).toFixed(precision) + ' MB  ';
  } else if ((bytes >= gigabyte) && (bytes < terabyte)) {
    return (bytes / gigabyte).toFixed(precision) + ' GB  ';
  } else if (bytes >= terabyte) {
    return (bytes / terabyte).toFixed(precision) + ' TB  ';
  } else {
    return bytes + ' B   ';
  }
};

// Draw memory bars
/**
 * Description
 * @method drawRatio
 * @param {} bar_memory
 * @param {} memory
 * @return
 */
Monit.drawRatio = function(bar_memory, memory) {
  var scale = 0;

  if (memory < RATIO_T1) scale = RATIO_T1;
  else if (memory < RATIO_T2) scale = RATIO_T2;
  else if (memory < RATIO_T3) scale = RATIO_T3;
  else scale = RATIO_T4;

  bar_memory.ratio(memory,
		   scale,
		   bytesToSize(memory, 3));
};

/**
 * Updates bars informations
 * @param  {} proc       proc object
 * @return  this
 */
Monit.updateBars = function(proc) {
  if (this.bars[proc.pid]) {
    if (!proc.monit) {
      this.bars[proc.pid].cpu.percent(0, chalk.red('No data'));
      this.drawRatio(this.bars[proc.pid].memory, 0, chalk.red('No data'));
    } else {
      this.bars[proc.pid].cpu.percent(proc.monit.cpu);
      this.drawRatio(this.bars[proc.pid].memory, proc.monit.memory);
    }
  }

  return this;
}

module.exports = Monit;
