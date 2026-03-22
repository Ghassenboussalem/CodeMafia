/**
 * Per-test fix hints for civilians and sabotage hints for the impostor.
 * Keyed by challenge id, then indexed by test position (0–8).
 *
 * Each entry:
 *   fix:         { line, hint, code }  — shown to civilians on red tests
 *   sabotage:    { line, hint, code }  — shown to impostor in mission panel
 */

const hints = {

  // ── Object-Oriented Programming: Banking System ────────────────────────────
  oop_bank_system: [
    // Section 1
    {
      fix:      { line: 15, hint: 'Change  >= 0  to  <= 0  (reject non-positive amounts)', code: 'if amount <= 0:' },
      sabotage: { line: 15, hint: 'Change  <=  back to  >=  so negatives sneak through',   code: 'if amount >= 0:' },
    },
    {
      fix:      { line: 22, hint: 'Replace  raise RuntimeError(...)  with  return False',    code: '            return False' },
      sabotage: { line: 22, hint: 'Change  return False  back to  raise RuntimeError(...)', code: '            raise RuntimeError("Account is closed")' },
    },
    {
      fix:      { line: 26, hint: 'Already correct — self.active = False is right', code: '        self.active = False' },
      sabotage: { line: 26, hint: 'Change  False  to  True  to leave the account open',   code: '        self.active = True' },
    },
    // Section 2
    {
      fix:      { line: 35, hint: 'Change  -=  to  +=  so deposit ADDS to balance',         code: '        self.balance += amount' },
      sabotage: { line: 35, hint: 'Change  +=  back to  -=  so deposits subtract instead', code: '        self.balance -= amount' },
    },
    {
      fix:      { line: 44, hint: 'Add a funds check:  if self.balance < amount: return False', code: '        if self.balance < amount: return False' },
      sabotage: { line: 44, hint: 'Remove or comment out the balance >= amount guard', code: '        # (remove the balance check)' },
    },
    {
      fix:      { line: 82, hint: 'Remove the  + 1  so it returns the actual balance',      code: '        return self.balance' },
      sabotage: { line: 82, hint: 'Add  + 1  back:  return self.balance + 1',              code: '        return self.balance + 1' },
    },
    // Section 3
    {
      fix:      { line: 89, hint: 'Replace the 2nd return with a list comprehension filter', code: '        return [t for t in self.transactions if t[0] == type]' },
      sabotage: { line: 89, hint: 'Make both branches return ALL transactions (no filter)', code: '        return self.transactions' },
    },
    {
      fix:      { line: 93, hint: 'Replace  return 0  with  return len(self.transactions)', code: '        return len(self.transactions)' },
      sabotage: { line: 93, hint: 'Change  return len(...)  back to  return 0',            code: '        return 0' },
    },
    {
      fix:      { line: 100, hint: 'Change  [0]  to  [-1]  to return the LAST transaction', code: '        return self.transactions[-1]' },
      sabotage: { line: 100, hint: 'Change  [-1]  back to  [0]  to return the first item', code: '        return self.transactions[0]' },
    },
  ],

  // ── Data Structures & Algorithms: Search & Sort Library ───────────────────
  // Test order: [0] right boundary, [1] pointers advance, [2] search_all,
  //             [3] merge comparison, [4] merge remainders, [5] merge_sort structure,
  //             [6] count_comparisons, [7] is_sorted, [8] find_max
  dsa_search_sort: [
    // Section 1 — tests 0,1,2
    {
      // test 0: binary_search right boundary correct
      fix:      { line: 8,  hint: 'Change  len(arr)  to  len(arr) - 1  for the right boundary', code: '    left, right = 0, len(arr) - 1' },
      sabotage: { line: 8,  hint: 'Change  len(arr) - 1  back to  len(arr)',                    code: '    left, right = 0, len(arr)' },
    },
    {
      // test 1: binary_search pointers advance correctly (both left AND right)
      fix:      { line: 14, hint: 'Change  left = mid  to  left = mid + 1  AND  right = mid  to  right = mid - 1', code: '            left = mid + 1\n            ...\n            right = mid - 1' },
      sabotage: { line: 14, hint: 'Change  left = mid + 1  to  left = mid  (or right = mid - 1 to right = mid)', code: '            left = mid' },
    },
    {
      // test 2: search_all searches from index 0
      fix:      { line: 25, hint: 'Change  enumerate(arr[1:])  to  enumerate(arr)  so index 0 is searched', code: '    for i, val in enumerate(arr):' },
      sabotage: { line: 25, hint: 'Change  enumerate(arr)  back to  enumerate(arr[1:])  to skip first element', code: '    for i, val in enumerate(arr[1:]):' },
    },
    // Section 2 — tests 3,4,5
    {
      // test 3: merge_sort comparison uses <=
      fix:      { line: 35, hint: 'Change  left[i] <  to  left[i] <=  to handle equal elements', code: '        if left[i] <= right[j]:' },
      sabotage: { line: 35, hint: 'Change  <=  back to  <  so equal elements are mis-ordered', code: '        if left[i] < right[j]:' },
    },
    {
      // test 4: merge includes both remainders
      fix:      { line: 39, hint: 'Add  result.extend(right[j:])  on a new line after  result.extend(left[i:])', code: '    result.extend(right[j:])' },
      sabotage: { line: 39, hint: 'Remove  result.extend(right[j:])  so right-side remainder is dropped', code: '    # (remove result.extend(right[j:]))' },
    },
    {
      // test 5: merge_sort returns sorted array (structural — already passes)
      fix:      { line: 32, hint: 'Already correct — merge_sort calls merge() and returns the result', code: '(already correct)' },
      sabotage: { line: 37, hint: 'Change  return merge(left, right)  to  return left + right  (broken merge)', code: '    return left + right' },
    },
    // Section 3 — tests 6,7,8
    {
      // test 6: count_comparisons returns count not 0
      fix:      { line: 56, hint: 'Change  return 0  to  return count  at the end of count_comparisons', code: '    return count' },
      sabotage: { line: 56, hint: 'Change  return count  back to  return 0', code: '    return 0' },
    },
    {
      // test 7: is_sorted correctly checks order (already correct in starter)
      fix:      { line: 61, hint: 'is_sorted already has the correct logic — no change needed', code: '(already correct)' },
      sabotage: { line: 61, hint: 'Flip the comparison signs:  >  to  <  and vice versa in is_sorted', code: 'if ascending and arr[i] < arr[i + 1]: return False' },
    },
    {
      // test 8: find_max returns maximum not minimum
      fix:      { line: 68, hint: 'Change  min(arr)  to  max(arr)  in find_max', code: '    return max(arr)' },
      sabotage: { line: 68, hint: 'Change  max(arr)  back to  min(arr)', code: '    return min(arr)' },
    },
  ],

  // ── Security: Auth & Permission System ────────────────────────────────────
  sec_auth_system: [
    // Section 1
    {
      fix:      { line: 11, hint: 'Change  hashlib.md5  to  hashlib.sha256', code: '    hashed = hashlib.sha256((password + salt).encode()).hexdigest()' },
      sabotage: { line: 11, hint: 'Change  sha256  back to  md5',           code: '    hashed = hashlib.md5((password + salt).encode()).hexdigest()' },
    },
    {
      fix:      { line: 17, hint: 'Replace  return True  with actual hash comparison', code: '    return hash_password(password, salt).split(":")[1] == _' },
      sabotage: { line: 17, hint: 'Change the check back to  return True',             code: '    return True' },
    },
    {
      fix:      { line: 21, hint: 'Change  < 4  to  < 8  for the minimum length check', code: '    if len(password) < 8:' },
      sabotage: { line: 21, hint: 'Change  < 8  back to  < 4',                          code: '    if len(password) < 4:' },
    },
    // Section 2
    {
      fix:      { line: 31, hint: 'Change  + 0  to  + 3600  for a 1-hour token expiry', code: '        "expires": time.time() + 3600' },
      sabotage: { line: 31, hint: 'Change  + 3600  back to  + 0  so tokens expire immediately', code: '        "expires": time.time() + 0' },
    },
    {
      fix:      { line: 37, hint: 'Add an expiry check:  if time.time() > tokens[token]["expires"]: return None', code: '    if time.time() > tokens[token]["expires"]: return None' },
      sabotage: { line: 37, hint: 'Remove the expiry check so expired tokens still work', code: '    # (remove expiry check)' },
    },
    {
      fix:      { line: 42, hint: 'Replace  pass  with  del tokens[token]  to actually revoke it', code: '        del tokens[token]' },
      sabotage: { line: 42, hint: 'Change  del tokens[token]  back to  pass',                     code: '        pass' },
    },
    // Section 3
    {
      fix:      { line: 54, hint: 'Give admin all permissions:  "admin": ["read", "write", "delete"]', code: '        "admin":  ["read", "write", "delete"],' },
      sabotage: { line: 54, hint: 'Empty the admin permission list:  "admin": []',                    code: '        "admin":  [],' },
    },
    {
      fix:      { line: 60, hint: 'Change  !=  to  ==  so is_admin returns True for admins', code: '    return user_roles.get(user_id) == "admin"' },
      sabotage: { line: 60, hint: 'Change  ==  back to  !=  so it returns the opposite',    code: '    return user_roles.get(user_id) != "admin"' },
    },
    {
      fix:      { line: 65, hint: 'Add  and len(name) > 0  to reject empty strings', code: '    return isinstance(name, str) and len(name) > 0' },
      sabotage: { line: 65, hint: 'Remove the  len(name) > 0  check',                code: '    return isinstance(name, str)' },
    },
  ],

  // ── Front-End: UI Component System ────────────────────────────────────────
  fe_component_system: [
    // Section 1
    {
      fix:      { line: 13, hint: 'Merge state with spread:  this.state = { ...this.state, ...patch }', code: '    this.state = { ...this.state, ...patch };' },
      sabotage: { line: 13, hint: 'Remove the spread so it replaces:  this.state = patch',              code: '    this.state = patch;' },
    },
    {
      fix:      { line: 18, hint: 'Change  return undefined  to  return this.state', code: '    return this.state;' },
      sabotage: { line: 18, hint: 'Change  return this.state  back to  return undefined', code: '    return undefined;' },
    },
    {
      fix:      { line: 24, hint: 'Return a filter/remove function:  return () => { this.listeners = this.listeners.filter(f => f !== fn); }', code: '    return () => { this.listeners = this.listeners.filter(f => f !== fn); };' },
      sabotage: { line: 24, hint: 'Return empty arrow  () => {}  so unsubscribe does nothing', code: '    return () => {};' },
    },
    // Section 2
    {
      fix:      { line: 39, hint: 'Add  this.routes[path] = handler;  inside register()', code: '    this.routes[path] = handler;' },
      sabotage: { line: 39, hint: 'Remove the route assignment so register does nothing',  code: '    // nothing' },
    },
    {
      fix:      { line: 44, hint: 'Add  this.current = path;  inside navigate()', code: '    this.current = path;' },
      sabotage: { line: 44, hint: 'Remove  this.current = path  so navigate never updates it', code: '    // nothing' },
    },
    {
      fix:      { line: 49, hint: 'Change  return null  to  return this.current', code: '    return this.current;' },
      sabotage: { line: 49, hint: 'Change  return this.current  back to  return null', code: '    return null;' },
    },
    // Section 3
    {
      fix:      { line: 60, hint: 'Create and return a real element:  const el = document.createElement(tag); ...  return el;', code: '    const el = document.createElement(tag); el.textContent = text; return el;' },
      sabotage: { line: 60, hint: 'Change back to  return null',  code: '    return null;' },
    },
    {
      fix:      { line: 65, hint: 'Add  el.classList.add(...classes);  inside addClass()', code: '    el.classList.add(...classes);' },
      sabotage: { line: 65, hint: 'Remove the classList.add call so addClass does nothing', code: '    // nothing' },
    },
    {
      fix:      { line: 72, hint: 'Change  el.style = val  to  el.style[prop] = val', code: '    el.style[prop] = val;' },
      sabotage: { line: 72, hint: 'Change  el.style[prop] = val  back to  el.style = val', code: '    el.style = val;' },
    },
  ],

  // ── Back-End: REST API Server ──────────────────────────────────────────────
  be_api_server: [
    // Section 1
    {
      fix:      { line: 9,  hint: 'Add  next();  at the end of the logger function body', code: '  next();' },
      sabotage: { line: 9,  hint: 'Remove  next()  from logger so the request chain stops', code: '  // (remove next())' },
    },
    {
      fix:      { line: 16, hint: 'Replace  res.status(403)  with  next()  after the token check', code: '  if (token) return next(); res.status(403).json({ error: "Forbidden" });' },
      sabotage: { line: 16, hint: 'Remove  next()  so valid tokens still get 403',               code: '  res.status(403).json({ error: "Forbidden" });' },
    },
    {
      fix:      { line: 22, hint: 'Add  res.status(err.status || 500).json({ error: err.message });', code: '  res.status(err.status || 500).json({ error: err.message });' },
      sabotage: { line: 22, hint: 'Remove  res.status/json  so errorHandler sends no response', code: '  // (remove res.status)' },
    },
    // Section 2
    {
      fix:      { line: 31, hint: 'Change key from  this.routes[path]  to  this.routes[`${method}:${path}`]', code: '    this.routes[`${method}:${path}`] = handler;' },
      sabotage: { line: 31, hint: 'Change back to  this.routes[path]  so method is ignored',                  code: '    this.routes[path] = handler;' },
    },
    {
      fix:      { line: 37, hint: 'Pass params to the handler:  handler(req, res, this.extractParams(...))', code: '    handler(req, res, this.extractParams(key, req.path));' },
      sabotage: { line: 37, hint: 'Remove params from handler call:  handler(req, res)',                      code: '    handler(req, res);' },
    },
    {
      fix:      { line: 43, hint: 'Change  .slice(2)  to  .slice(1)  in extractParams', code: '    const values = path.split("/").slice(1);' },
      sabotage: { line: 43, hint: 'Change  .slice(1)  back to  .slice(2)',              code: '    const values = path.split("/").slice(2);' },
    },
    // Section 3
    {
      fix:      { line: 54, hint: 'Add  return entry.value;  (replace the second  return undefined)', code: '    return entry.value;' },
      sabotage: { line: 54, hint: 'Change  return entry.value  back to  return undefined', code: '    return undefined;' },
    },
    {
      fix:      { line: 60, hint: 'Change  return true  to  return this.store[ip].count >= maxReq', code: '    return this.store[ip].count >= maxReq;' },
      sabotage: { line: 60, hint: 'Change the check back to  return true  so nothing is ever blocked', code: '    return true;' },
    },
    {
      fix:      { line: 66, hint: 'Add cleanup logic:  Object.keys(this.store).forEach(k => { if (Date.now() > this.store[k].expires) delete this.store[k]; });', code: '    Object.keys(this.store).forEach(k => { if (Date.now() > this.store[k].expires) delete this.store[k]; });' },
      sabotage: { line: 66, hint: 'Empty the cleanup body so expired entries are never removed', code: '    // nothing' },
    },
  ],
};

/**
 * Returns the 9 hints for a given challenge id.
 * Each element in the array corresponds to challenge.tests[i].
 */
function getHintsForChallenge(challengeId) {
  return hints[challengeId] || [];
}

module.exports = { getHintsForChallenge };
