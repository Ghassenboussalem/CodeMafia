import json, sys, threading

TIMEOUT = 4

TEST_NAMES = [
    "put stores value by key",
    "get retrieves correct value",
    "get returns -1 for missing key",
    "capacity evicts LRU on overflow",
    "get updates recency on hit",
    "put updates existing key in-place",
    "eviction order is correct after gets",
    "size does not exceed capacity",
    "clear resets the cache",
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
        'OrderedDict': __import__('collections').OrderedDict,
    }

    ns = {'__builtins__': safe_builtins}
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    if 'LRUCache' not in ns:
        return [{"name": t, "passed": False, "error": "LRUCache class not found"} for t in TEST_NAMES]

    LRUCache = ns['LRUCache']
    results = []

    # Test 1: put stores value
    try:
        c = LRUCache(3)
        c.put(1, 'a')
        results.append({"name": TEST_NAMES[0], "passed": c.get(1) == 'a'})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: get retrieves correct value
    try:
        c = LRUCache(3)
        c.put(5, 'hello')
        results.append({"name": TEST_NAMES[1], "passed": c.get(5) == 'hello'})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: get returns -1 for missing
    try:
        c = LRUCache(2)
        results.append({"name": TEST_NAMES[2], "passed": c.get(99) == -1})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: capacity evicts LRU
    try:
        c = LRUCache(2)
        c.put(1, 'a')
        c.put(2, 'b')
        c.put(3, 'c')  # should evict key 1
        results.append({"name": TEST_NAMES[3], "passed": c.get(1) == -1 and c.get(3) == 'c'})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: get updates recency
    try:
        c = LRUCache(2)
        c.put(1, 'a')
        c.put(2, 'b')
        c.get(1)       # 1 is now most recently used
        c.put(3, 'c')  # should evict key 2, not 1
        results.append({"name": TEST_NAMES[4], "passed": c.get(1) == 'a' and c.get(2) == -1})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: put updates existing key
    try:
        c = LRUCache(3)
        c.put(1, 'old')
        c.put(1, 'new')
        results.append({"name": TEST_NAMES[5], "passed": c.get(1) == 'new'})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: eviction order after gets
    try:
        c = LRUCache(3)
        c.put(1, 'a'); c.put(2, 'b'); c.put(3, 'c')
        c.get(1); c.get(2)           # 3 is now LRU
        c.put(4, 'd')                # evict 3
        results.append({"name": TEST_NAMES[6], "passed": c.get(3) == -1 and c.get(4) == 'd'})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: size never exceeds capacity
    try:
        c = LRUCache(2)
        for i in range(10):
            c.put(i, i)
        size = len(c.cache) if hasattr(c, 'cache') else 2
        results.append({"name": TEST_NAMES[7], "passed": size <= 2})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: clear resets cache
    try:
        c = LRUCache(3)
        c.put(1, 'x')
        c.clear()
        results.append({"name": TEST_NAMES[8], "passed": c.get(1) == -1})
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
