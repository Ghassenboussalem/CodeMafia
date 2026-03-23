import json, sys, threading, time as _time

TIMEOUT = 4

TEST_NAMES = [
    "hash_password uses sha256",
    "verify_password checks the hash",
    "is_strong_password requires length 8",
    "create_token sets 1 hour expiry",
    "validate_token checks expiry",
    "revoke_token removes from tokens",
    "has_permission grants admin all rights",
    "is_admin returns True for admins",
    "validate_permission_name rejects empty string",
]

DANGEROUS = ['import os', 'import subprocess', 'import socket',
             'import importlib', '__import__', 'open(', '__reduce__']

def run_tests(code):
    for bad in DANGEROUS:
        if bad in code:
            return [{"name": t, "passed": False, "error": "Forbidden: " + bad} for t in TEST_NAMES]

    import builtins, hashlib, secrets

    safe_builtins = {
        '__build_class__': builtins.__build_class__,
        '__name__': '__main__',
        'range': range, 'len': len, 'list': list, 'dict': dict,
        'str': str, 'int': int, 'float': float, 'bool': bool,
        'tuple': tuple, 'set': set, 'type': type,
        'None': None, 'True': True, 'False': False,
        'ValueError': ValueError, 'TypeError': TypeError,
        'Exception': Exception, 'ImportError': ImportError,
        'print': print, 'isinstance': isinstance,
        'hasattr': hasattr, 'getattr': getattr,
        'any': any, 'all': all,
        # allow the specific imports the challenge uses
        '__import__': lambda name, *a, **k: (
            __import__(name, *a, **k) if name in ('hashlib', 'secrets', 'time') else (_ for _ in ()).throw(ImportError(f"Import of '{name}' is blocked"))
        ),
    }

    ns = {
        '__builtins__': safe_builtins,
        'hashlib': hashlib,
        'secrets': secrets,
        'time': _time,
    }
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    results = []

    # Test 1: hash_password uses sha256
    try:
        hash_password = ns.get('hash_password')
        if not hash_password:
            raise Exception("hash_password not found")
        result = hash_password('testpass')
        salt, hashed = result.split(':')
        # sha256 hex digest = 64 chars; md5 = 32 chars
        results.append({"name": TEST_NAMES[0], "passed": bool(len(hashed) == 64)})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: verify_password checks the hash
    try:
        hash_password = ns.get('hash_password')
        verify_password = ns.get('verify_password')
        if not hash_password or not verify_password:
            raise Exception("functions not found")
        stored = hash_password('mypassword')
        correct = verify_password('mypassword', stored)
        wrong = verify_password('wrongpass', stored)
        results.append({"name": TEST_NAMES[1], "passed": bool(correct == True and wrong == False)})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: is_strong_password requires length 8
    try:
        is_strong_password = ns.get('is_strong_password')
        if not is_strong_password:
            raise Exception("is_strong_password not found")
        r1 = is_strong_password('Ab1')        # too short → False
        r2 = is_strong_password('Ab12345')    # 7 chars → False
        r3 = is_strong_password('Ab123456')   # 8 chars with upper+digit → True
        results.append({"name": TEST_NAMES[2], "passed": bool(
            r1 == False and r2 == False and r3 == True
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: create_token sets 1 hour expiry
    try:
        create_token = ns.get('create_token')
        tokens = ns.get('tokens', {})
        if not create_token:
            raise Exception("create_token not found")
        before = _time.time()
        token = create_token('user1')
        after = _time.time()
        entry = ns['tokens'].get(token)
        expires = entry['expires'] if entry else None
        # Should be within a few seconds of time.time() + 3600
        results.append({"name": TEST_NAMES[3], "passed": bool(
            expires is not None and
            abs(expires - (before + 3600)) < 5
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: validate_token checks expiry
    try:
        create_token = ns.get('create_token')
        validate_token = ns.get('validate_token')
        if not create_token or not validate_token:
            raise Exception("functions not found")
        token = create_token('user2')
        # Manually expire it
        ns['tokens'][token]['expires'] = _time.time() - 10
        result = validate_token(token)
        results.append({"name": TEST_NAMES[4], "passed": bool(result is None)})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: revoke_token removes from tokens
    try:
        create_token = ns.get('create_token')
        revoke_token = ns.get('revoke_token')
        if not create_token or not revoke_token:
            raise Exception("functions not found")
        token = create_token('user3')
        revoke_token(token)
        results.append({"name": TEST_NAMES[5], "passed": bool(token not in ns['tokens'])})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: has_permission grants admin all rights
    try:
        assign_role = ns.get('assign_role')
        has_permission = ns.get('has_permission')
        if not assign_role or not has_permission:
            raise Exception("functions not found")
        assign_role('admin_user', 'admin')
        r1 = has_permission('admin_user', 'read')
        r2 = has_permission('admin_user', 'write')
        r3 = has_permission('admin_user', 'delete')
        results.append({"name": TEST_NAMES[6], "passed": bool(r1 and r2 and r3)})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: is_admin returns True for admins
    try:
        assign_role = ns.get('assign_role')
        is_admin = ns.get('is_admin')
        if not assign_role or not is_admin:
            raise Exception("functions not found")
        assign_role('admin2', 'admin')
        assign_role('editor1', 'editor')
        r1 = is_admin('admin2')
        r2 = is_admin('editor1')
        results.append({"name": TEST_NAMES[7], "passed": bool(r1 == True and r2 == False)})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: validate_permission_name rejects empty string
    try:
        validate_permission_name = ns.get('validate_permission_name')
        if not validate_permission_name:
            raise Exception("validate_permission_name not found")
        r1 = validate_permission_name('')
        r2 = validate_permission_name('read')
        r3 = validate_permission_name('write')
        results.append({"name": TEST_NAMES[8], "passed": bool(
            r1 == False and r2 == True and r3 == True
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[8], "passed": False, "error": str(e)})

    return results


code = sys.stdin.buffer.read().decode('utf-8')
result_holder = [None]

def target():
    result_holder[0] = run_tests(code)

t = threading.Thread(target=target, daemon=True)
t.start()
t.join(TIMEOUT)

if t.is_alive():
    output = [{"name": n, "passed": False, "error": "Timeout"} for n in TEST_NAMES]
else:
    output = result_holder[0] or [{"name": n, "passed": False, "error": "No results"} for n in TEST_NAMES]

sys.stdout.buffer.write(json.dumps(output).encode('utf-8'))
sys.stdout.buffer.write(b'\n')
