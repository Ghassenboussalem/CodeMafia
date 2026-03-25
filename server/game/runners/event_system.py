# pyre-ignore-all-errors
import json, sys, threading

TIMEOUT = 4

TEST_NAMES = [
    "subscribe adds listener",
    "unsubscribe removes listener",
    "emit calls all listeners",
    "once fires only one time",
    "emit passes args to listeners",
    "priority orders listeners high-first",
    "namespace isolates events",
    "history records emitted events",
    "replay re-emits history to new subscriber",
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
        'tuple': tuple, 'set': set, 'type': type, 'sorted': sorted,
        'None': None, 'True': True, 'False': False,
        'ValueError': ValueError, 'TypeError': TypeError,
        'Exception': Exception, 'print': print,
        'isinstance': isinstance, 'hasattr': hasattr,
        'getattr': getattr, 'super': super,
        'enumerate': enumerate, 'zip': zip, 'map': map,
        'filter': filter, 'any': any, 'all': all,
        'min': min, 'max': max, 'sum': sum,
    }

    ns = {'__builtins__': safe_builtins}
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    if 'EventBus' not in ns:
        return [{"name": t, "passed": False, "error": "EventBus class not found"} for t in TEST_NAMES]

    EventBus = ns['EventBus']
    results = []

    # Test 1: subscribe adds listener
    try:
        bus = EventBus()
        calls = []
        bus.subscribe('click', lambda: calls.append(1))
        results.append({"name": TEST_NAMES[0], "passed": len(bus.listeners.get('click', [])) == 1})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: unsubscribe removes listener
    try:
        bus = EventBus()
        fn = lambda: None
        bus.subscribe('x', fn)
        bus.unsubscribe('x', fn)
        results.append({"name": TEST_NAMES[1], "passed": len(bus.listeners.get('x', [])) == 0})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: emit calls all listeners
    try:
        bus = EventBus()
        calls = []
        bus.subscribe('go', lambda: calls.append('a'))
        bus.subscribe('go', lambda: calls.append('b'))
        bus.emit('go')
        results.append({"name": TEST_NAMES[2], "passed": sorted(calls) == ['a', 'b']})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: once fires only one time
    try:
        bus = EventBus()
        calls = []
        bus.once('ping', lambda: calls.append(1))
        bus.emit('ping')
        bus.emit('ping')
        results.append({"name": TEST_NAMES[3], "passed": len(calls) == 1})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: emit passes args to listeners
    try:
        bus = EventBus()
        received = []
        bus.subscribe('data', lambda x, y: received.append((x, y)))
        bus.emit('data', 10, 20)
        results.append({"name": TEST_NAMES[4], "passed": received == [(10, 20)]})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: priority orders listeners high-first
    try:
        bus = EventBus()
        order = []
        bus.subscribe('ev', lambda: order.append('low'),  priority=1)
        bus.subscribe('ev', lambda: order.append('high'), priority=10)
        bus.subscribe('ev', lambda: order.append('mid'),  priority=5)
        bus.emit('ev')
        results.append({"name": TEST_NAMES[5], "passed": order == ['high', 'mid', 'low']})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: namespace isolates events
    try:
        bus = EventBus()
        calls_a, calls_b = [], []
        bus.subscribe('ns_a:click', lambda: calls_a.append(1))
        bus.subscribe('ns_b:click', lambda: calls_b.append(1))
        bus.emit('ns_a:click')
        results.append({"name": TEST_NAMES[6], "passed": len(calls_a) == 1 and len(calls_b) == 0})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: history records emitted events
    try:
        bus = EventBus()
        bus.emit('boot', 'arg1')
        bus.emit('boot', 'arg2')
        h = bus.get_history('boot')
        results.append({"name": TEST_NAMES[7], "passed": len(h) == 2})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: replay re-emits history to new subscriber
    try:
        bus = EventBus()
        bus.emit('load', 42)
        received = []
        bus.subscribe('load', lambda x: received.append(x))
        bus.replay('load')
        results.append({"name": TEST_NAMES[8], "passed": received == [42]})
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
