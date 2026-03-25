# pyre-ignore-all-errors
import json, sys, threading

TIMEOUT = 4

TEST_NAMES = [
    "initial state is set correctly",
    "valid transition changes state",
    "invalid transition raises error",
    "guard condition blocks transition",
    "on_enter callback fires on entry",
    "on_exit callback fires on exit",
    "history tracks all transitions",
    "can_transition returns correct bool",
    "reset returns to initial state",
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
        'hasattr': hasattr, 'getattr': getattr,
    }

    ns = {'__builtins__': safe_builtins}
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    if 'StateMachine' not in ns:
        return [{"name": t, "passed": False, "error": "StateMachine class not found"} for t in TEST_NAMES]

    StateMachine = ns['StateMachine']
    results = []

    # Setup helper: traffic light FSM
    def make_light():
        sm = StateMachine('red')
        sm.add_transition('red',    'go',   'green')
        sm.add_transition('green',  'slow', 'yellow')
        sm.add_transition('yellow', 'stop', 'red')
        return sm

    # Test 1: initial state
    try:
        sm = StateMachine('idle')
        results.append({"name": TEST_NAMES[0], "passed": sm.state == 'idle'})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: valid transition
    try:
        sm = make_light()
        sm.transition('go')
        results.append({"name": TEST_NAMES[1], "passed": sm.state == 'green'})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: invalid transition raises
    try:
        sm = make_light()
        raised = False
        try:
            sm.transition('slow')  # 'slow' not valid from 'red'
        except Exception:
            raised = True
        results.append({"name": TEST_NAMES[2], "passed": raised})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: guard condition blocks
    try:
        sm = StateMachine('locked')
        sm.add_transition('locked', 'unlock', 'open', guard=lambda: False)
        raised = False
        try:
            sm.transition('unlock')
        except Exception:
            raised = True
        results.append({"name": TEST_NAMES[3], "passed": raised and sm.state == 'locked'})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: on_enter fires
    try:
        sm = make_light()
        entered = []
        sm.on_enter('green', lambda: entered.append(True))
        sm.transition('go')
        results.append({"name": TEST_NAMES[4], "passed": entered == [True]})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: on_exit fires
    try:
        sm = make_light()
        exited = []
        sm.on_exit('red', lambda: exited.append(True))
        sm.transition('go')
        results.append({"name": TEST_NAMES[5], "passed": exited == [True]})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: history tracks transitions
    try:
        sm = make_light()
        sm.transition('go')
        sm.transition('slow')
        h = sm.history
        results.append({"name": TEST_NAMES[6], "passed": len(h) == 2 and h[0][0] == 'red'})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: can_transition
    try:
        sm = make_light()
        results.append({"name": TEST_NAMES[7], "passed": sm.can_transition('go') == True and sm.can_transition('stop') == False})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: reset
    try:
        sm = make_light()
        sm.transition('go')
        sm.reset()
        results.append({"name": TEST_NAMES[8], "passed": sm.state == 'red'})
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
