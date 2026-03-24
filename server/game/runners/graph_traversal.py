import json, sys, threading

TIMEOUT = 4

TEST_NAMES = [
    "add_edge creates adjacency",
    "bfs visits all nodes",
    "bfs order is level-by-level",
    "dfs visits all nodes",
    "has_path finds existing path",
    "has_path returns False for no path",
    "cycle detection finds cycle",
    "cycle detection passes acyclic graph",
    "shortest_path returns correct length",
]

DANGEROUS = ['import os', 'import sys', 'import subprocess', 'import socket',
             'import importlib', '__import__', 'open(', '__reduce__']

def run_tests(code):
    for bad in DANGEROUS:
        if bad in code:
            return [{"name": t, "passed": False, "error": "Forbidden: " + bad} for t in TEST_NAMES]

    import builtins
    import collections as _collections
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
        'enumerate': enumerate, 'sorted': sorted,
        'deque': _collections.deque,
        'defaultdict': _collections.defaultdict,
    }

    # Allow only 'collections' imports so player code `from collections import X` works
    def _safe_import(name, *args, **kwargs):
        if name == 'collections':
            return _collections
        raise ImportError(f"import '{name}' is not allowed in sandbox")
    safe_builtins['__import__'] = _safe_import

    ns = {
        '__builtins__': safe_builtins,
        'deque': _collections.deque,
        'defaultdict': _collections.defaultdict,
    }
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    if 'Graph' not in ns:
        return [{"name": t, "passed": False, "error": "Graph class not found"} for t in TEST_NAMES]

    Graph = ns['Graph']
    results = []

    # Test 1: add_edge
    try:
        g = Graph()
        g.add_edge(1, 2)
        results.append({"name": TEST_NAMES[0], "passed": 2 in g.adjacency.get(1, [])})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: bfs visits all
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(1, 3); g.add_edge(2, 4)
        visited = g.bfs(1)
        results.append({"name": TEST_NAMES[1], "passed": sorted(visited) == [1, 2, 3, 4]})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: bfs level order
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(1, 3); g.add_edge(2, 4); g.add_edge(3, 5)
        visited = g.bfs(1)
        # 1 must come before 2&3, which must come before 4&5
        ok = (visited.index(1) < visited.index(2) and
              visited.index(1) < visited.index(3) and
              visited.index(2) < visited.index(4) and
              visited.index(3) < visited.index(5))
        results.append({"name": TEST_NAMES[2], "passed": ok})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: dfs visits all
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(1, 3); g.add_edge(2, 4)
        visited = g.dfs(1)
        results.append({"name": TEST_NAMES[3], "passed": sorted(visited) == [1, 2, 3, 4]})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: has_path true
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3)
        results.append({"name": TEST_NAMES[4], "passed": g.has_path(1, 3) == True})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: has_path false
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(3, 4)
        results.append({"name": TEST_NAMES[5], "passed": g.has_path(1, 4) == False})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: cycle detection
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 1)  # cycle
        results.append({"name": TEST_NAMES[6], "passed": g.has_cycle() == True})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: no cycle
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(1, 3)
        results.append({"name": TEST_NAMES[7], "passed": g.has_cycle() == False})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: shortest_path
    try:
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(1, 3)
        length = g.shortest_path(1, 3)
        results.append({"name": TEST_NAMES[8], "passed": length == 1})
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
