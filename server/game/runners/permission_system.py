import json, sys, threading

TIMEOUT = 4

TEST_NAMES = [
    "assign_role gives user a role",
    "grant adds permission to role",
    "has_permission returns True for granted",
    "has_permission returns False for missing",
    "revoke removes permission",
    "role_inherits inherits parent perms",
    "superadmin has all permissions",
    "deny overrides grant",
    "list_permissions shows role perms",
]

DANGEROUS = ['import os', 'import sys', 'import subprocess', 'import socket',
             'import importlib', '__import__', 'open(', '__reduce__']

def run_tests(code):
    for bad in DANGEROUS:
        if bad in code:
            return [{"name": t, "passed": False, "error": "Forbidden: " + bad} for t in TEST_NAMES]

    import builtins
    safe_builtins = {
        '__build_class__': builtins.__build_class__,
        '__name__': '__main__',
        'range': range, 'len': len, 'list': list, 'dict': dict,
        'str': str, 'int': int, 'float': float, 'bool': bool,
        'tuple': tuple, 'set': set, 'type': type,
        'None': None, 'True': True, 'False': False,
        'ValueError': ValueError, 'TypeError': TypeError,
        'Exception': Exception, 'print': print,
        'isinstance': isinstance, 'super': super,
        'hasattr': hasattr, 'sorted': sorted,
    }

    ns = {'__builtins__': safe_builtins}
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    if 'PermissionSystem' not in ns:
        return [{"name": t, "passed": False, "error": "PermissionSystem class not found"} for t in TEST_NAMES]

    PermissionSystem = ns['PermissionSystem']
    results = []

    # Test 1: assign_role
    try:
        ps = PermissionSystem()
        ps.assign_role('alice', 'admin')
        results.append({"name": TEST_NAMES[0], "passed": ps.get_role('alice') == 'admin'})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: grant
    try:
        ps = PermissionSystem()
        ps.grant('editor', 'write')
        perms = ps.list_permissions('editor')
        results.append({"name": TEST_NAMES[1], "passed": 'write' in perms})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: has_permission True
    try:
        ps = PermissionSystem()
        ps.assign_role('bob', 'viewer')
        ps.grant('viewer', 'read')
        results.append({"name": TEST_NAMES[2], "passed": ps.has_permission('bob', 'read') == True})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: has_permission False
    try:
        ps = PermissionSystem()
        ps.assign_role('carol', 'viewer')
        ps.grant('viewer', 'read')
        results.append({"name": TEST_NAMES[3], "passed": ps.has_permission('carol', 'delete') == False})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: revoke
    try:
        ps = PermissionSystem()
        ps.grant('mod', 'write')
        ps.revoke('mod', 'write')
        perms = ps.list_permissions('mod')
        results.append({"name": TEST_NAMES[4], "passed": 'write' not in perms})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: role inheritance
    try:
        ps = PermissionSystem()
        ps.grant('base', 'read')
        ps.role_inherits('editor', 'base')
        ps.assign_role('dave', 'editor')
        results.append({"name": TEST_NAMES[5], "passed": ps.has_permission('dave', 'read') == True})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: superadmin
    try:
        ps = PermissionSystem()
        ps.assign_role('root', 'superadmin')
        results.append({"name": TEST_NAMES[6], "passed": ps.has_permission('root', 'anything') == True})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: deny overrides grant
    try:
        ps = PermissionSystem()
        ps.grant('analyst', 'export')
        ps.deny('analyst', 'export')
        ps.assign_role('eve', 'analyst')
        results.append({"name": TEST_NAMES[7], "passed": ps.has_permission('eve', 'export') == False})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: list_permissions
    try:
        ps = PermissionSystem()
        ps.grant('ops', 'deploy')
        ps.grant('ops', 'monitor')
        perms = ps.list_permissions('ops')
        results.append({"name": TEST_NAMES[8], "passed": sorted(perms) == ['deploy', 'monitor']})
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
