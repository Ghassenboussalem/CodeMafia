# pyre-ignore-all-errors
import json, sys, threading

TIMEOUT = 4
PER_TEST_TIMEOUT = 2

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


def safe_test(test_fn, name, timeout=PER_TEST_TIMEOUT):
    """Run a single test with its own timeout so infinite loops don't kill other tests."""
    result_holder = [None]
    error_holder = [None]
    def target():
        try:
            result_holder[0] = test_fn()
        except Exception as e:
            error_holder[0] = e
    t = threading.Thread(target=target, daemon=True)
    t.start()
    t.join(timeout)
    if t.is_alive():
        return {"name": name, "passed": False, "error": "Timeout (possible infinite loop)"}
    if error_holder[0]:
        return {"name": name, "passed": False, "error": str(error_holder[0])}
    return {"name": name, "passed": bool(result_holder[0])}


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
    def test_0():
        g = Graph()
        g.add_edge(1, 2)
        return 2 in g.adjacency.get(1, [])
    results.append(safe_test(test_0, TEST_NAMES[0]))

    # Test 2: bfs visits all
    def test_1():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(1, 3); g.add_edge(2, 4)
        visited = g.bfs(1)
        return sorted(visited) == [1, 2, 3, 4]
    results.append(safe_test(test_1, TEST_NAMES[1]))

    # Test 3: bfs level order
    def test_2():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(1, 3); g.add_edge(2, 4); g.add_edge(3, 5)
        visited = g.bfs(1)
        ok = (visited.index(1) < visited.index(2) and
              visited.index(1) < visited.index(3) and
              visited.index(2) < visited.index(4) and
              visited.index(3) < visited.index(5))
        return ok
    results.append(safe_test(test_2, TEST_NAMES[2]))

    # Test 4: dfs visits all
    def test_3():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(1, 3); g.add_edge(2, 4)
        visited = g.dfs(1)
        return sorted(visited) == [1, 2, 3, 4]
    results.append(safe_test(test_3, TEST_NAMES[3]))

    # Test 5: has_path true
    def test_4():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3)
        return g.has_path(1, 3) == True
    results.append(safe_test(test_4, TEST_NAMES[4]))

    # Test 6: has_path false
    def test_5():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(3, 4)
        return g.has_path(1, 4) == False
    results.append(safe_test(test_5, TEST_NAMES[5]))

    # Test 7: cycle detection
    def test_6():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(3, 1)
        return g.has_cycle() == True
    results.append(safe_test(test_6, TEST_NAMES[6]))

    # Test 8: no cycle
    def test_7():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(1, 3)
        return g.has_cycle() == False
    results.append(safe_test(test_7, TEST_NAMES[7]))

    # Test 9: shortest_path
    def test_8():
        g = Graph()
        g.add_edge(1, 2); g.add_edge(2, 3); g.add_edge(1, 3)
        length = g.shortest_path(1, 3)
        return length == 1
    results.append(safe_test(test_8, TEST_NAMES[8]))

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
