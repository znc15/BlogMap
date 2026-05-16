/**
 * 简单日志工具
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const LOG_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const CURRENT_LEVEL = process.env.LOG_LEVEL || 'INFO';

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, ...args) {
  if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LEVEL]) return;
  const prefix = `[${timestamp()}] [${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else if (level === 'WARN') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

const logger = {
  debug: (...args) => log('DEBUG', ...args),
  info: (...args) => log('INFO', ...args),
  warn: (...args) => log('WARN', ...args),
  error: (...args) => log('ERROR', ...args)
};

module.exports = logger;
