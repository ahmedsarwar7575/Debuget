#!/usr/bin/env node
// enhancedErrorLogger.js
// Enhanced Error Logger for Node.js with respect for theme settings (emoji/colors).

import StackTrace from 'stacktrace-js';
import chalk from 'chalk';
import boxen from 'boxen';

// ==== COLOR CONFIGURATION ====
const COLORS = {
  critical: chalk.hex('#FF6B6B').bold,
  warning: chalk.hex('#FFD93D'),
  info: chalk.hex('#6CBEED'),
  code: chalk.hex('#A9E34B').italic,
  path: chalk.hex('#748FFC').underline,
  validation: chalk.hex('#FF8C00'),
  jwt: chalk.hex('#8A2BE2'),
  abort: chalk.yellowBright,
  aggregate: chalk.magenta,
  http: chalk.cyan,
  dns: chalk.blueBright,
  tls: chalk.redBright,
  stream: chalk.greenBright,
};

// ==== EMOJI / HEADER CONFIGURATION ====
const EMOJI = {
  database: '🔥 DATABASE MELTDOWN',
  syntax: '📜 SCRIPT ERROR',
  network: '🌐 NETWORK FAIL',
  auth: '🔐 ACCESS DENIED',
  validation: '🛡️ VALIDATION FAILED',
  code: '💻 CODE ISSUE',
  jwt: '🔑 JWT ERROR',
  fs: '📂 FILE SYSTEM ERROR',
  abort: '⏹️ ABORTED',
  aggregate: '🔗 AGGREGATE FAILURE',
  http: '🌐 HTTP ERROR',
  dns: '📡 DNS ERROR',
  tls: '🔒 TLS FAILURE',
  stream: '🔄 STREAM ERROR',
  default: '💥 RUNTIME ISSUE',
};

// ==== LOGGER CONFIGURATION ====
const config = {
  theme: {
    emoji: true,
    colors: true,
    stackDepth: 3,
    showStack: true,
  }
};

// ==== HELPERS TO RESPECT THEME SETTINGS ====
function applyColor(fn, text) {
  return config.theme.colors ? fn(text) : text;
}
function applyLabel(text) {
  return config.theme.colors ? chalk.bold(text) : text;
}
function applyEmoji(header) {
  if (!config.theme.emoji) {
    const idx = header.indexOf(' ');
    return idx >= 0 ? header.slice(idx + 1) : header;
  }
  return header;
}

// ==== CATEGORY DETECTION ====
function determineCategory(err) {
  if (err.name === 'SyntaxError') return 'syntax';
  if (err.name === 'TypeError' || err.name === 'ReferenceError') return 'code';
  if (err.name === 'ValidationError') return 'validation';
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return 'jwt';
  if (err.name === 'AbortError') return 'abort';
  if (err.name === 'AggregateError') return 'aggregate';
  if (err.response?.status >= 400 && err.response.status < 600) return 'http';
  const code = err.code || '';
  if (/ECONN|MONGO|POSTGRES/i.test(code)) return 'database';
  if (/ENOTFOUND|ETIMEDOUT|ECONNRESET|EHOSTUNREACH/i.test(code)) return 'network';
  if (/EACCES|EPERM/i.test(code)) return 'auth';
  if (/ENOENT|EEXIST|EISDIR|ENOTDIR/i.test(code)) return 'fs';
  if (/EAI_AGAIN|ENETUNREACH|EADDRINFO/i.test(code)) return 'dns';
  if (/EPIPE|ERR_STREAM_PREMATURE_CLOSE/i.test(code)) return 'stream';
  if (/CERT_|UNABLE_TO_VERIFY/i.test(code)) return 'tls';
  if (/EJSON|EPARSE/i.test(err.message)) return 'syntax';
  return 'default';
}

// ==== NATURAL-LANGUAGE EXPLANATIONS ====
function getNaturalLanguageExplanation(err) {
  const messages = {
    ECONNREFUSED:    `Couldn't reach the database. Is it running?`,
    ENOENT:          `Tried to access a file that doesn't exist. Check the path.`,
    ENOTFOUND:       `Network connection failed. Check your internet connection.`,
    EACCES:          `Permission denied. Try running with elevated privileges.`,
    EPIPE:           `A broken pipe occurred. Ensure the receiving stream is open.`,
    ETIMEDOUT:       `Operation timed out. The resource may be unavailable.`,
    EHOSTUNREACH:    `Host unreachable. Verify network settings or DNS.`,
    EAI_AGAIN:       `DNS lookup timed out. Try again later.`,
    CERT_HAS_EXPIRED:  `SSL certificate expired. Renew the certificate.`,
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: `SSL verification failed. Check your CA chain.`,
    SyntaxError:       `There was a syntax problem. Verify your code or JSON.`,
    ReferenceError:    `Tried to use a variable or function that doesn't exist.`,
    TypeError:         `Tried to use a value in an invalid way (wrong type).`,
    ValidationError:   `Input failed validation rules. Check required fields.`,
    JsonWebTokenError: `Your authentication token is invalid or malformed.`,
    TokenExpiredError: `Your authentication token has expired. Please log in again.`,
    AggregateError:    `Multiple errors occurred. Check each cause.`,
    AbortError:        `The operation was aborted before completion.`,
    400: `Bad request. Check your inputs or query parameters.`,
    401: `Unauthorized. You need to log in or refresh credentials.`,
    403: `Forbidden. You don’t have permission to perform this action.`,
    404: `Not found. The requested resource doesn’t exist.`,
    500: `Internal server error. Something went wrong on the server.`,
    default: `An unexpected error occurred while running the application.`,
  };
  if (err.code && messages[err.code]) return messages[err.code];
  const status = err.status || err.statusCode;
  if (status && messages[status]) return messages[status];
  if (err.name && messages[err.name]) return messages[err.name];
  return messages.default;
}

// ==== ERROR FORMATTING ====
async function formatError(err) {
  try {
    const { name, message, code, status, statusCode, stack } = err;
    const category      = determineCategory(err);
    const rawHeader     = EMOJI[category] || EMOJI.default;
    const headerText    = applyEmoji(rawHeader);
    const header        = applyColor(COLORS.critical, headerText);
    const explanationTxt= getNaturalLanguageExplanation(err);
    const explanation   = applyColor(COLORS.info, explanationTxt);
    const timestampIso  = new Date().toISOString();
    const timestamp     = applyColor(chalk.dim, timestampIso);

    // Meta info
    const meta = [
      timestamp,
      ...(statusCode||status ? [`${applyLabel('Status:')} ${statusCode||status}`] : []),
      `${config.theme.colors?chalk.red('Error:'):'Error:'} ${name}: ${message}`,
      ...(code ? [`${applyLabel('Code:')} ${code}`] : []),
    ];

    // Stack journey
    const frames = await StackTrace.fromError(err);
    const stackJourney = frames
      .filter(f => !f.fileName?.includes('node_modules'))
      .slice(0, config.theme.stackDepth)
      .map(frame => {
        const fn       = frame.functionName||'<anonymous>';
        const fnStyled = applyColor(COLORS.code, fn);
        const pathStyled=applyColor(COLORS.path,`${frame.fileName}:${frame.lineNumber}`);
        return `${applyColor(chalk.dim,'➜')} ${fnStyled}\n   ${pathStyled}`;
      })
      .join('\n\n');

    // Compose box
    const content = [
      header,
      meta.join('\n'),
      `${applyLabel('What happened?')}  ${explanation}`,
      `${applyLabel('Where it broke:')}  ${applyColor(COLORS.code,stack.split('\n')[1]?.trim()||'Unknown location')}`,
      `${applyLabel('Call journey:')}\n${stackJourney}`,
    ].join('\n\n');

    return boxen(content, {
      padding: 1,
      borderColor: config.theme.colors ? '#FF6B6B' : 'grey',
      borderStyle: 'round',
      margin: 1,
    });
  } catch (formatErr) {
    console.error('Error formatting error:', formatErr);
    return err.stack;
  }
}

// ==== PUBLIC LOGGER ====
export const log = async err => {
  const formatted = await formatError(err);
  console.error('\n' + formatted + '\n');
};

// ==== CONFIGURATION API ====
export function setConfig(newTheme) {
  Object.assign(config.theme, newTheme);
}

// ==== EXPRESS MIDDLEWARE ====
export const expressMiddleware = () => async (err, req, res, next) => {
  await log(err);
  res.status(err.statusCode || 500).json({ error: err.message });
};

// ==== PROCESS-LEVEL HANDLERS ====
process.on('uncaughtException', async error => {
  await log(error);
  process.exit(1);
});
process.on('unhandledRejection', async reason => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  await log(error);
  process.exit(1);
});
