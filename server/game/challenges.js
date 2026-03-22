/**
 * Each challenge is a single coherent file split into 3 sections.
 * Players work on the entire file throughout the game.
 * Tests accumulate — passing a test keeps it green forever.
 * The impostor's goal is to make a passing test fail again.
 *
 * Structure:
 *   code[]         — plain text lines, NO HTML
 *   sections[]     — { title, startLine, endLine }
 *   tests[]        — 9 total (3 per section), each with validate(lines)
 *   impostorGoals  — description of what the impostor should try to do
 */

const challenges = {

  'Object-Oriented Programming': {
    id: 'oop_bank_system',
    title: 'Banking System',
    language: 'python',
    description: 'A banking system with accounts, transactions, and validation.',
    impostorGoals: [
      'Flip a comparison sign in validate_amount (> to >=)',
      'Change withdrawal logic to add instead of subtract',
      'Make get_balance return self.balance + 1',
    ],
    sections: [
      { title: 'Account Creation & Validation', startLine: 0,  endLine: 24 },
      { title: 'Deposits & Withdrawals',        startLine: 25, endLine: 50 },
      { title: 'Transaction History',           startLine: 51, endLine: 75 },
    ],
    code: [
      '# Banking System — Fix all bugs across 3 sections',
      '# Work together to pass all 9 tests',
      '',
      '# ═══ SECTION 1: Account Creation & Validation ═══',
      '',
      'class BankAccount:',
      '    def __init__(self, owner, initial_balance=0):',
      '        self.owner = owner',
      '        self.balance = initial_balance',
      '        self.transactions = []',
      '        self.active = True',
      '',
      '    # BUG: should reject negative amounts (use > not >=)',
      '    def validate_amount(self, amount):',
      '        if amount >= 0:',
      '            raise ValueError("Amount must be positive")',
      '        return True',
      '',
      '    # BUG: should return False when not active, not raise',
      '    def is_active(self):',
      '        if not self.active:',
      '            raise RuntimeError("Account is closed")',
      '        return True',
      '',
      '    def close_account(self):',
      '        self.active = False',
      '',
      '# ═══ SECTION 2: Deposits & Withdrawals ═══',
      '',
      '    # BUG: subtracts instead of adds on deposit',
      '    def deposit(self, amount):',
      '        self.validate_amount(amount)',
      '        if not self.is_active():',
      '            return False',
      '        self.balance -= amount',
      '        self.transactions.append(("deposit", amount))',
      '        return True',
      '',
      '    # BUG: does not check sufficient funds',
      '    def withdraw(self, amount):',
      '        self.validate_amount(amount)',
      '        if not self.is_active():',
      '            return False',
      '        self.balance -= amount',
      '        self.transactions.append(("withdraw", amount))',
      '        return True',
      '',
      '    # BUG: returns balance + 1',
      '    def get_balance(self):',
      '        return self.balance + 1',
      '',
      '# ═══ SECTION 3: Transaction History ═══',
      '',
      '    # BUG: returns all transactions instead of filtered type',
      '    def get_transactions(self, type=None):',
      '        if type is None:',
      '            return self.transactions',
      '        return self.transactions',
      '',
      '    # BUG: count returns 0 always',
      '    def transaction_count(self):',
      '        return 0',
      '',
      '    # BUG: last_transaction returns first instead of last',
      '    def last_transaction(self):',
      '        if not self.transactions:',
      '            return None',
      '        return self.transactions[0]',
    ],
    tests: [
      // Section 1
      {
        name: 'validate_amount rejects negatives',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def validate_amount')[1]?.split('def ')[0] || '';
          return /amount\s*<=\s*0|amount\s*<\s*0/.test(body) ||
                 (/if\s+amount/.test(body) && />/.test(body) && !/>=/.test(body.split('if amount')[1]?.split('\n')[0] || ''));
        },
      },
      {
        name: 'is_active returns False gracefully',
        section: 0,
        fix: { line: 22, hint: 'Replace raise RuntimeError(...) with return False', code: '            return False' },
        sabotageHint: { line: 22, hint: 'Change return False back to raise RuntimeError', code: '            raise RuntimeError("Account is closed")' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def is_active')[1]?.split('def ')[0] || '';
          return /return\s+False/.test(body) && !/raise/.test(body);
        },
      },
      {
        name: 'close_account deactivates account',
        section: 0,
        fix: { line: 26, hint: 'This one is already correct — self.active = False is there', code: '        self.active = False' },
        sabotageHint: { line: 26, hint: 'Change self.active = False to self.active = True', code: '        self.active = True' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def close_account')[1]?.split('def ')[0] || '';
          return /self\.active\s*=\s*False/.test(body);
        },
      },
      // Section 2
      {
        name: 'deposit adds to balance',
        section: 1,
        fix: { line: 35, hint: 'Change -= to +=', code: '        self.balance += amount' },
        sabotageHint: { line: 35, hint: 'Change += back to -=', code: '        self.balance -= amount' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def deposit')[1]?.split('def ')[0] || '';
          return /self\.balance\s*\+=\s*amount/.test(body) &&
                 !/self\.balance\s*-=\s*amount/.test(body);
        },
      },
      {
        name: 'withdraw checks sufficient funds',
        section: 1,
        fix: { line: 44, hint: 'Add a check before subtracting: if self.balance < amount: return False', code: '        if self.balance < amount: return False' },
        sabotageHint: { line: 44, hint: 'Remove the balance check so it always subtracts', code: '        # no check' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def withdraw')[1]?.split('def ')[0] || '';
          return /self\.balance\s*>=\s*amount|amount\s*<=\s*self\.balance/.test(body);
        },
      },
      {
        name: 'get_balance returns exact balance',
        section: 1,
        fix: { line: 82, hint: 'Remove the + 1', code: '        return self.balance' },
        sabotageHint: { line: 82, hint: 'Add + 1 back: return self.balance + 1', code: '        return self.balance + 1' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def get_balance')[1]?.split('def ')[0] || '';
          return /return\s+self\.balance\b/.test(body) &&
                 !/return\s+self\.balance\s*[+\-\*]/.test(body);
        },
      },
      // Section 3
      {
        name: 'get_transactions filters by type',
        section: 2,
        fix: { line: 89, hint: 'Replace the second `return self.transactions` with a filtered list', code: '        return [t for t in self.transactions if t[0] == type]' },
        sabotageHint: { line: 89, hint: 'Make both branches return self.transactions (no filter)', code: '        return self.transactions' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def get_transactions')[1]?.split('def ')[0] || '';
          return /t\[0\]\s*==\s*type|filter|for\s+t\s+in/.test(body) &&
                 body.split('return').length > 2;
        },
      },
      {
        name: 'transaction_count returns correct count',
        section: 2,
        fix: { line: 93, hint: 'Replace return 0 with return len(self.transactions)', code: '        return len(self.transactions)' },
        sabotageHint: { line: 93, hint: 'Change return len(...) back to return 0', code: '        return 0' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def transaction_count')[1]?.split('def ')[0] || '';
          return /return\s+len\(self\.transactions\)/.test(body) &&
                 !/return\s+0/.test(body);
        },
      },
      {
        name: 'last_transaction returns last item',
        section: 2,
        fix: { line: 100, hint: 'Change [0] to [-1] to get the last item', code: '        return self.transactions[-1]' },
        sabotageHint: { line: 100, hint: 'Change [-1] back to [0]', code: '        return self.transactions[0]' },
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def last_transaction')[1]?.split('def ')[0] || '';
          return /self\.transactions\[-1\]/.test(body) &&
                 !/self\.transactions\[0\]/.test(body);
        },
      },
    ],
  },

  'Data Structures & Algorithms': {
    id: 'dsa_search_sort',
    title: 'Search & Sort Library',
    language: 'python',
    description: 'A utility library with binary search, merge sort, and analysis tools.',
    impostorGoals: [
      'Change mid+1 back to mid in binary search',
      'Break the merge step in merge sort',
      'Make count_comparisons return 0',
    ],
    sections: [
      { title: 'Binary Search',  startLine: 0,  endLine: 28 },
      { title: 'Merge Sort',     startLine: 29, endLine: 60 },
      { title: 'Analysis Tools', startLine: 61, endLine: 85 },
    ],
    code: [
      '# Search & Sort Library — Fix all bugs across 3 sections',
      '# Work together to pass all 9 tests',
      '',
      '# ═══ SECTION 1: Binary Search ═══',
      '',
      '# BUG: right should be len(arr) - 1',
      'def binary_search(arr, target):',
      '    left, right = 0, len(arr)',
      '    while left <= right:',
      '        mid = (left + right) // 2',
      '        if arr[mid] == target:',
      '            return mid',
      '        elif arr[mid] < target:',
      '            # BUG: should be mid + 1',
      '            left = mid',
      '        else:',
      '            # BUG: should be mid - 1',
      '            right = mid',
      '    return -1',
      '',
      '# BUG: should search all elements, not arr[1:]',
      'def search_all(arr, target):',
      '    results = []',
      '    for i, val in enumerate(arr[1:]):',
      '        if val == target:',
      '            results.append(i)',
      '    return results',
      '',
      '# ═══ SECTION 2: Merge Sort ═══',
      '',
      'def merge_sort(arr):',
      '    if len(arr) <= 1:',
      '        return arr',
      '    mid = len(arr) // 2',
      '    left  = merge_sort(arr[:mid])',
      '    right = merge_sort(arr[mid:])',
      '    return merge(left, right)',
      '',
      'def merge(left, right):',
      '    result = []',
      '    i = j = 0',
      '    while i < len(left) and j < len(right):',
      '        # BUG: should be <=, not <',
      '        if left[i] < right[j]:',
      '            result.append(left[i])',
      '            i += 1',
      '        else:',
      '            result.append(right[j])',
      '            j += 1',
      '    # BUG: missing remainder — should extend with both leftovers',
      '    result.extend(left[i:])',
      '    return result',
      '',
      '# ═══ SECTION 3: Analysis Tools ═══',
      '',
      '# BUG: always returns 0',
      'def count_comparisons(arr, target):',
      '    count = 0',
      '    for item in arr:',
      '        count += 1',
      '        if item == target:',
      '            break',
      '    return 0',
      '',
      '# BUG: is_sorted checks wrong direction',
      'def is_sorted(arr, ascending=True):',
      '    for i in range(len(arr) - 1):',
      '        if ascending and arr[i] > arr[i + 1]:',
      '            return False',
      '        if not ascending and arr[i] < arr[i + 1]:',
      '            return False',
      '    return True',
      '',
      '# BUG: returns minimum instead of maximum',
      'def find_max(arr):',
      '    if not arr:',
      '        return None',
      '    return min(arr)',
    ],
    tests: [
      {
        name: 'binary_search right boundary correct',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          // Strip comments first so 'right = len(arr) - 1' in a comment doesn't count
          const body = code.split('def binary_search')[1]?.split('def ')[0] || '';
          const noComments = body.split('\n').map(l => l.replace(/#.*$/, '')).join('\n');
          return /len\(arr\)\s*-\s*1/.test(noComments);
        },
      },
      {
        name: 'binary_search pointers advance correctly',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          return /left\s*=\s*mid\s*\+\s*1/.test(code) &&
                 /right\s*=\s*mid\s*-\s*1/.test(code);
        },
      },
      {
        name: 'search_all searches from index 0',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def search_all')[1]?.split('def ')[0] || '';
          return /enumerate\(arr\)/.test(body) && !/arr\[1:\]/.test(body);
        },
      },
      {
        name: 'merge_sort comparison uses <=',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def merge(')[1]?.split('def ')[0] || '';
          return /left\[i\]\s*<=\s*right\[j\]/.test(body);
        },
      },
      {
        name: 'merge includes both remainders',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def merge(')[1]?.split('def ')[0] || '';
          // Accept .extend() or += forms, with optional whitespace inside brackets
          const hasLeft  = /result\.extend\(left\[i:\s*\]\)|result\s*\+=\s*left\[i:\s*\]/.test(body);
          const hasRight = /result\.extend\(right\[j:\s*\]\)|result\s*\+=\s*right\[j:\s*\]/.test(body);
          return hasLeft && hasRight;
        },
      },
      {
        name: 'merge_sort returns sorted array',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          return /def merge_sort/.test(code) &&
                 /return merge\(/.test(code) &&
                 /def merge\(/.test(code);
        },
      },
      {
        name: 'count_comparisons returns count not 0',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def count_comparisons')[1]?.split('def ')[0] || '';
          return /return\s+count/.test(body) && !/return\s+0/.test(body);
        },
      },
      {
        name: 'is_sorted correctly checks order',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def is_sorted')[1]?.split('def ')[0] || '';
          return /arr\[i\]\s*>\s*arr\[i\s*\+\s*1\]/.test(body) &&
                 /arr\[i\]\s*<\s*arr\[i\s*\+\s*1\]/.test(body);
        },
      },
      {
        name: 'find_max returns maximum not minimum',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def find_max')[1]?.split('def ')[0] || '';
          return /return\s+max\(arr\)/.test(body) && !/return\s+min\(arr\)/.test(body);
        },
      },
    ],
  },

  'Security': {
    id: 'sec_auth_system',
    title: 'Auth & Permission System',
    language: 'python',
    description: 'A complete authentication and permission management system.',
    impostorGoals: [
      'Make password hashing use md5 instead of sha256',
      'Make token validation always return True',
      'Remove the admin check from has_permission',
    ],
    sections: [
      { title: 'Password & Hashing',    startLine: 0,  endLine: 28 },
      { title: 'Token Management',      startLine: 29, endLine: 55 },
      { title: 'Permission System',     startLine: 56, endLine: 80 },
    ],
    code: [
      '# Auth & Permission System — Fix all bugs across 3 sections',
      '# Work together to pass all 9 tests',
      '',
      '# ═══ SECTION 1: Password & Hashing ═══',
      '',
      'import hashlib, secrets, time',
      '',
      '# BUG: uses md5 instead of sha256',
      'def hash_password(password, salt=None):',
      '    if salt is None:',
      '        salt = secrets.token_hex(16)',
      '    hashed = hashlib.md5((password + salt).encode()).hexdigest()',
      '    return f"{salt}:{hashed}"',
      '',
      '# BUG: always returns True',
      'def verify_password(password, stored_hash):',
      '    salt, _ = stored_hash.split(":")',
      '    return True',
      '',
      '# BUG: min length is 4, should be 8',
      'def is_strong_password(password):',
      '    if len(password) < 4:',
      '        return False',
      '    has_upper = any(c.isupper() for c in password)',
      '    has_digit = any(c.isdigit() for c in password)',
      '    return has_upper and has_digit',
      '',
      '# ═══ SECTION 2: Token Management ═══',
      '',
      'tokens = {}',
      '',
      '# BUG: expiry is 0 seconds (should be 3600)',
      'def create_token(user_id):',
      '    token = secrets.token_hex(32)',
      '    tokens[token] = {',
      '        "user_id": user_id,',
      '        "expires": time.time() + 0',
      '    }',
      '    return token',
      '',
      '# BUG: does not check expiry',
      'def validate_token(token):',
      '    if token not in tokens:',
      '        return None',
      '    return tokens[token]["user_id"]',
      '',
      '# BUG: does not delete from tokens dict',
      'def revoke_token(token):',
      '    if token in tokens:',
      '        pass',
      '',
      '# ═══ SECTION 3: Permission System ═══',
      '',
      'user_roles = {}',
      '',
      'def assign_role(user_id, role):',
      '    user_roles[user_id] = role',
      '',
      '# BUG: admin always gets False',
      'def has_permission(user_id, permission):',
      '    role = user_roles.get(user_id, "guest")',
      '    permissions = {',
      '        "admin":  [],',
      '        "editor": ["read", "write"],',
      '        "viewer": ["read"],',
      '        "guest":  []',
      '    }',
      '    return permission in permissions.get(role, [])',
      '',
      '# BUG: returns opposite — should return True if admin',
      'def is_admin(user_id):',
      '    return user_roles.get(user_id) != "admin"',
      '',
      '# BUG: allows empty permission string',
      'def validate_permission_name(name):',
      '    return isinstance(name, str)',
    ],
    tests: [
      {
        name: 'hash_password uses sha256',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def hash_password')[1]?.split('def ')[0] || '';
          return /sha256/.test(body) && !/md5/.test(body);
        },
      },
      {
        name: 'verify_password checks the hash',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def verify_password')[1]?.split('def ')[0] || '';
          // Must NOT just return True, AND must have an actual comparison
          // using hash_password or hexdigest, with == to compare two values
          return !/return\s+True/.test(body) &&
                 /hash_password|hexdigest/.test(body) &&
                 /==/.test(body);
        },
      },
      {
        name: 'is_strong_password requires length 8',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def is_strong_password')[1]?.split('def ')[0] || '';
          return /len\(password\)\s*<\s*8/.test(body);
        },
      },
      {
        name: 'create_token sets 1 hour expiry',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def create_token')[1]?.split('def ')[0] || '';
          return /time\.time\(\)\s*\+\s*3600/.test(body);
        },
      },
      {
        name: 'validate_token checks expiry',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def validate_token')[1]?.split('def ')[0] || '';
          return /time\.time\(\)|expires/.test(body);
        },
      },
      {
        name: 'revoke_token removes from tokens',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def revoke_token')[1]?.split('def ')[0] || '';
          // Strip comments, then require del or pop — no comment trickery
          const noComments = body.split('\n').map(l => l.replace(/#.*$/, '')).join('\n');
          return /del\s+tokens\[token\]|tokens\.pop\(token\)/.test(noComments);
        },
      },
      {
        name: 'has_permission grants admin all rights',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def has_permission')[1]?.split('def ')[0] || '';
          // Extract specifically what's inside the admin array: "admin": [   ...   ]
          // Then verify read, write, delete are all inside that extracted slice
          const adminMatch = body.match(/"admin"\s*:\s*\[([^\]]*)]/);
          if (!adminMatch) return false;
          const adminPerms = adminMatch[1];
          return /"read"/.test(adminPerms) &&
                 /"write"/.test(adminPerms) &&
                 /"delete"/.test(adminPerms);
        },
      },
      {
        name: 'is_admin returns True for admins',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def is_admin')[1]?.split('def ')[0] || '';
          return /==\s*"admin"/.test(body) && !/!=\s*"admin"/.test(body);
        },
      },
      {
        name: 'validate_permission_name rejects empty string',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('def validate_permission_name')[1]?.split('def ')[0] || '';
          return /len\(name\)\s*>\s*0|name\s*!=\s*""|bool\(name\)/.test(body);
        },
      },
    ],
  },

  'Front-End': {
    id: 'fe_component_system',
    title: 'UI Component System',
    language: 'javascript',
    description: 'A component system with state management, routing, and DOM utilities.',
    impostorGoals: [
      'Make setState replace state instead of merging',
      'Make navigate not update the current route',
      'Break the event listener cleanup',
    ],
    sections: [
      { title: 'State Management', startLine: 0,  endLine: 30 },
      { title: 'Router',          startLine: 31, endLine: 58 },
      { title: 'DOM Utilities',   startLine: 59, endLine: 85 },
    ],
    code: [
      '// UI Component System — Fix all bugs across 3 sections',
      '// Work together to pass all 9 tests',
      '',
      '// ═══ SECTION 1: State Management ═══',
      '',
      'class Store {',
      '  constructor(initial) {',
      '    this.state = initial;',
      '    this.listeners = [];',
      '    this.history = [];',
      '  }',
      '',
      '  // BUG: replaces state instead of merging',
      '  setState(patch) {',
      '    this.history.push(this.state);',
      '    this.state = patch;',
      '    this.listeners.forEach(fn => fn(this.state));',
      '  }',
      '',
      '  // BUG: returns undefined',
      '  getState() {',
      '    return undefined;',
      '  }',
      '',
      '  // BUG: never removes listener on unsubscribe',
      '  subscribe(fn) {',
      '    this.listeners.push(fn);',
      '    return () => {};',
      '  }',
      '',
      '  // BUG: undo does nothing',
      '  undo() {',
      '    if (this.history.length === 0) return;',
      '    const prev = this.history.pop();',
      '  }',
      '',
      '// ═══ SECTION 2: Router ═══',
      '',
      'class Router {',
      '  constructor() {',
      '    this.routes = {};',
      '    this.current = "/";',
      '    this.beforeEach = null;',
      '  }',
      '',
      '  // BUG: does not save the route handler',
      '  register(path, handler) {',
      '    // missing',
      '  }',
      '',
      '  // BUG: does not update this.current',
      '  navigate(path) {',
      '    if (this.beforeEach) this.beforeEach(path);',
      '    const handler = this.routes[path];',
      '    if (handler) handler();',
      '  }',
      '',
      '  // BUG: returns null',
      '  getCurrent() {',
      '    return null;',
      '  }',
      '',
      '  use(middleware) {',
      '    this.beforeEach = middleware;',
      '  }',
      '',
      '// ═══ SECTION 3: DOM Utilities ═══',
      '',
      'class DOMUtils {',
      '  // BUG: returns null instead of creating element',
      '  createElement(tag, attrs = {}, text = "") {',
      '    return null;',
      '  }',
      '',
      '  // BUG: does nothing',
      '  addClass(el, ...classes) {',
      '    // missing',
      '  }',
      '',
      '  // BUG: never removes old listener before adding new one',
      '  on(el, event, handler) {',
      '    el.addEventListener(event, handler);',
      '  }',
      '',
      '  // BUG: sets property incorrectly',
      '  setStyle(el, prop, val) {',
      '    el.style = val;',
      '  }',
      '',
      '  // BUG: returns innerHTML not textContent',
      '  getText(el) {',
      '    return el.innerHTML;',
      '  }',
      '}',
    ],
    tests: [
      {
        name: 'setState merges state',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('setState(patch)')[1]?.split('getState')[0] || '';
          return /\.\.\.this\.state|Object\.assign/.test(body);
        },
      },
      {
        name: 'getState returns this.state',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('getState()')[1]?.split('subscribe')[0] || '';
          return /return\s+this\.state/.test(body) && !/return\s+undefined/.test(body);
        },
      },
      {
        name: 'subscribe returns working unsubscribe',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('subscribe(fn)')[1]?.split('undo')[0] || '';
          return /filter|splice|indexOf/.test(body);
        },
      },
      {
        name: 'register saves route handler',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('register(path')[1]?.split('navigate')[0] || '';
          return /this\.routes\[path\]\s*=\s*handler/.test(body);
        },
      },
      {
        name: 'navigate updates current path',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('navigate(path)')[1]?.split('getCurrent')[0] || '';
          return /this\.current\s*=\s*path/.test(body);
        },
      },
      {
        name: 'getCurrent returns current route',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('getCurrent()')[1]?.split('use(')[0] || '';
          return /return\s+this\.current/.test(body) && !/return\s+null/.test(body);
        },
      },
      {
        name: 'createElement creates real element',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('createElement(tag')[1]?.split('addClass')[0] || '';
          return /document\.createElement/.test(body) && !/return\s+null/.test(body);
        },
      },
      {
        name: 'addClass uses classList',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('addClass(el')[1]?.split('on(el')[0] || '';
          return /classList\.(add|toggle)/.test(body);
        },
      },
      {
        name: 'setStyle sets individual property',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('setStyle(el')[1]?.split('getText')[0] || '';
          return /el\.style\[prop\]|el\.style\./.test(body.replace('el.style = val', '')) &&
                 !/el\.style\s*=\s*val/.test(body);
        },
      },
    ],
  },

  'Back-End': {
    id: 'be_api_server',
    title: 'REST API Server',
    language: 'javascript',
    description: 'An Express-style API server with middleware, routing, and caching.',
    impostorGoals: [
      'Remove next() from the logger middleware',
      'Make the cache always return undefined',
      'Make the rate limiter always allow requests',
    ],
    sections: [
      { title: 'Middleware Pipeline', startLine: 0,  endLine: 30 },
      { title: 'Route Handler',       startLine: 31, endLine: 58 },
      { title: 'Cache & Rate Limit',  startLine: 59, endLine: 85 },
    ],
    code: [
      '// REST API Server — Fix all bugs across 3 sections',
      '// Work together to pass all 9 tests',
      '',
      '// ═══ SECTION 1: Middleware Pipeline ═══',
      '',
      '// BUG: never calls next()',
      'const logger = (req, res, next) => {',
      '  const timestamp = new Date().toISOString();',
      '  console.log(`[${timestamp}] ${req.method} ${req.url}`);',
      '};',
      '',
      '// BUG: blocks valid tokens',
      'const auth = (req, res, next) => {',
      '  const token = req.headers.authorization?.replace("Bearer ", "");',
      '  if (!token) {',
      '    return res.status(401).json({ error: "No token" });',
      '  }',
      '  res.status(403).json({ error: "Forbidden" });',
      '};',
      '',
      '// BUG: does not send error response',
      'const errorHandler = (err, req, res, next) => {',
      '  console.error(err.stack);',
      '};',
      '',
      '// BUG: does not attach parsed body to req',
      'const jsonParser = (req, res, next) => {',
      '  let body = "";',
      '  req.on("data", chunk => { body += chunk; });',
      '  req.on("end", () => {',
      '    next();',
      '  });',
      '};',
      '',
      '// ═══ SECTION 2: Route Handler ═══',
      '',
      'class Router {',
      '  constructor() {',
      '    this.routes = {};',
      '  }',
      '',
      '  // BUG: key should be `${method}:${path}`, uses only path',
      '  register(method, path, handler) {',
      '    this.routes[path] = handler;',
      '  }',
      '',
      '  // BUG: does not pass params to handler',
      '  handle(req, res) {',
      '    const key = `${req.method}:${req.path}`;',
      '    const handler = this.routes[key];',
      '    if (!handler) {',
      '      return res.status(404).json({ error: "Not found" });',
      '    }',
      '    handler(req, res);',
      '  }',
      '',
      '  // BUG: params extracted wrong (off by one)',
      '  extractParams(pattern, path) {',
      '    const keys = (pattern.match(/:[a-z]+/g) || []).map(k => k.slice(2));',
      '    const values = path.split("/").slice(2);',
      '    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));',
      '  }',
      '}',
      '',
      '// ═══ SECTION 3: Cache & Rate Limit ═══',
      '',
      'class Cache {',
      '  constructor(ttl = 60) {',
      '    this.store = {};',
      '    this.ttl = ttl;',
      '  }',
      '',
      '  // BUG: stores entry but get always returns undefined',
      '  set(key, value) {',
      '    this.store[key] = { value, expires: Date.now() + this.ttl * 1000 };',
      '  }',
      '',
      '  get(key) {',
      '    const entry = this.store[key];',
      '    if (!entry || Date.now() > entry.expires) return undefined;',
      '    return undefined;',
      '  }',
      '',
      '  // BUG: always returns true even when rate exceeded',
      '  isRateLimited(ip, maxReq = 10) {',
      '    if (!this.store[ip]) this.store[ip] = { count: 0, expires: Date.now() + 60000 };',
      '    this.store[ip].count++;',
      '    return true;',
      '  }',
      '',
      '  // BUG: does not delete expired entries',
      '  cleanup() {',
      '    const now = Date.now();',
      '  }',
      '}',
    ],
    tests: [
      {
        name: 'logger calls next()',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('const logger')[1]?.split('const auth')[0] || '';
          return /next\(\)/.test(body);
        },
      },
      {
        name: 'auth allows valid tokens',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('const auth')[1]?.split('const errorHandler')[0] || '';
          return /next\(\)/.test(body) && !/status\(403\)/.test(body);
        },
      },
      {
        name: 'errorHandler sends error response',
        section: 0,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('const errorHandler')[1]?.split('const jsonParser')[0] || '';
          return /res\.status|res\.json|res\.send/.test(body);
        },
      },
      {
        name: 'register uses method+path as key',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('register(method')[1]?.split('handle(')[0] || '';
          return /this\.routes\[`\$\{method\}/.test(body) ||
                 /this\.routes\[method/.test(body);
        },
      },
      {
        name: 'handle passes params to handler',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('handle(req')[1]?.split('extractParams')[0] || '';
          return /extractParams|params/.test(body) &&
                 /handler\(req,\s*res,\s*params\)|req\.params/.test(body);
        },
      },
      {
        name: 'extractParams slices from index 1',
        section: 1,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('extractParams(')[1]?.split('}')[0] || '';
          return /slice\(1\)/.test(body) && !/slice\(2\)/.test(body);
        },
      },
      {
        name: 'cache get returns stored value',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('get(key)')[1]?.split('isRateLimited')[0] || '';
          return /return\s+entry\.value/.test(body) &&
                 !/return\s+undefined/.test(body.split('if (!entry')[1] || '');
        },
      },
      {
        name: 'isRateLimited blocks when over limit',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('isRateLimited(')[1]?.split('cleanup')[0] || '';
          return /count\s*>=\s*maxReq|count\s*>\s*maxReq/.test(body) &&
                 !/return\s+true/.test(body.split('count')[1]?.split('\n')[0] || '');
        },
      },
      {
        name: 'cleanup removes expired entries',
        section: 2,
        validate: (lines) => {
          const code = lines.join('\n');
          const body = code.split('cleanup()')[1]?.split('}')[0] || '';
          return /delete\s+this\.store|filter|Object\.keys/.test(body) &&
                 body.trim().split('\n').length > 2;
        },
      },
    ],
  },
};

function getChallengeForCategory(category) {
  return challenges[category] || challenges['Object-Oriented Programming'];
}

module.exports = { challenges, getChallengeForCategory };