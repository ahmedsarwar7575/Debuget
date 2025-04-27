import fs from 'fs';
import {log, setConfig} from 'debuget';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
setConfig({ stackDepth: 15, showStack: false, colors: true, emoji: true });
// Now your logger will show 5 frames and hide the full stack trace.

(async () => {
  // 1. SyntaxError (invalid code)
  try {
    eval('foo bar');
  } catch (err) {
    await log(err);
  }

  // 2. ReferenceError (undefined variable)
  try {
    console.log(nonexistentVar);
  } catch (err) {
    await log(err);
  }

  // 3. TypeError (call non-function)
  try {
    null();
  } catch (err) {
    await log(err);
  }

  // 4. ValidationError (simulated)
  {
    const err = new Error('Test validation failed');
    err.name = 'ValidationError';
    await log(err);
  }

  // 5. JWT malformed token
  try {
    jwt.verify('bad.token.value', 'secret');
  } catch (err) {
    await log(err);
  }

  // 6. JWT expired token
  const shortToken = jwt.sign({ foo: 'bar' }, 'secret', { expiresIn: 1 });
  await new Promise(res => setTimeout(res, 1500));
  try {
    jwt.verify(shortToken, 'secret');
  } catch (err) {
    await log(err);
  }

  // 7. AbortError (simulated)
  {
    const err = new Error('Operation was aborted');
    err.name = 'AbortError';
    await log(err);
  }

  // 8. AggregateError (simulated)
  {
    const agg = new AggregateError([
      new Error('first failure'),
      new Error('second failure')
    ], 'Multiple operations failed');
    await log(agg);
  }

  // 9. HTTP error (status 404)
  try {
    await axios.get('https://httpstat.us/404');
  } catch (err) {
    await log(err);
  }

  // 10. File system error (ENOENT)
  try {
    await fs.promises.readFile('no-such-file.txt', 'utf8');
  } catch (err) {
    await log(err);
  }

  // 11. DNS error (simulated EAI_AGAIN)
  {
    const err = new Error('DNS lookup timed out');
    err.code = 'EAI_AGAIN';
    await log(err);
  }

  // 12. TLS error (simulated)
  {
    const err = new Error('Certificate has expired');
    err.code = 'CERT_HAS_EXPIRED';
    await log(err);
  }

  // 13. Stream error (simulated ERR_STREAM_PREMATURE_CLOSE)
  {
    const err = new Error('Stream closed prematurely');
    err.code = 'ERR_STREAM_PREMATURE_CLOSE';
    await log(err);
  }

  // 14. Database error (ECONNREFUSED)
  {
    const err = new Error('Database connection refused');
    err.code = 'ECONNREFUSED';
    await log(err);
  }

  // 15. Auth error (EACCES)
  {
    const err = new Error('Permission denied');
    err.code = 'EACCES';
    await log(err);
  }

  // 16. Default error
  {
    const err = new Error('Something went wrong');
    await log(err);
  }

  // 17. require missing module
  try {
    require('this-module-does-not-exist');
  } catch (err) {
    await log(err);
  }

  // 18. dynamic import missing module
  try {
    await import('another-nonexistent-module');
  } catch (err) {
    await log(err);
  }

  console.log('✅ All tests completed');
})();
