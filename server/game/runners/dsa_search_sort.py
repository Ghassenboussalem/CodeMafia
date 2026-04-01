import json, sys, threading

TIMEOUT = 4
PER_TEST_TIMEOUT = 2

TEST_NAMES = [
    "binary_search right boundary correct",
    "binary_search pointers advance correctly",
    "search_all searches from index 0",
    "merge_sort comparison uses <=",
    "merge includes both remainders",
    "merge_sort returns sorted array",
    "count_comparisons returns count not 0",
    "is_sorted correctly checks order",
    "find_max returns maximum not minimum",
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
    safe_builtins = {
        '__build_class__': builtins.__build_class__,
        '__name__': '__main__',
        'range': range, 'len': len, 'list': list, 'dict': dict,
        'str': str, 'int': int, 'float': float, 'bool': bool,
        'tuple': tuple, 'set': set, 'type': type,
        'None': None, 'True': True, 'False': False,
        'ValueError': ValueError, 'TypeError': TypeError,
        'Exception': Exception,
        'print': print, 'isinstance': isinstance,
        'enumerate': enumerate, 'zip': zip, 'sorted': sorted,
        'min': min, 'max': max, 'sum': sum, 'abs': abs,
    }

    ns = {'__builtins__': safe_builtins}
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    results = []

    # Test 1: binary_search right boundary correct
    def test_0():
        binary_search = ns.get('binary_search')
        if not binary_search:
            raise Exception("binary_search not found")
        r1 = binary_search([1, 3, 5, 7, 9], 1)
        r2 = binary_search([1, 3, 5, 7, 9], 5)
        r3 = binary_search([1, 3, 5, 7, 9], 9)
        r4 = binary_search([1, 3, 5, 7, 9], 6)
        return r1 == 0 and r2 == 2 and r3 == 4 and r4 == -1
    results.append(safe_test(test_0, TEST_NAMES[0]))

    # Test 2: binary_search pointers advance correctly
    def test_1():
        binary_search = ns.get('binary_search')
        if not binary_search:
            raise Exception("binary_search not found")
        r1 = binary_search([2, 4, 6, 8, 10, 12], 10)
        r2 = binary_search([2, 4, 6, 8, 10, 12], 2)
        r3 = binary_search([2, 4, 6, 8, 10, 12], 7)
        return r1 == 4 and r2 == 0 and r3 == -1
    results.append(safe_test(test_1, TEST_NAMES[1]))

    # Test 3: search_all searches from index 0
    def test_2():
        search_all = ns.get('search_all')
        if not search_all:
            raise Exception("search_all not found")
        r1 = search_all([5, 1, 2, 1, 3], 5)
        r2 = search_all([1, 2, 3, 2, 1], 2)
        return 0 in r1 and sorted(r2) == [1, 3]
    results.append(safe_test(test_2, TEST_NAMES[2]))

    # Test 4: merge_sort comparison uses <=
    def test_3():
        merge_sort = ns.get('merge_sort')
        if not merge_sort:
            raise Exception("merge_sort not found")
        r1 = merge_sort([3, 1, 2, 2, 1])
        return r1 == [1, 1, 2, 2, 3]
    results.append(safe_test(test_3, TEST_NAMES[3]))

    # Test 5: merge includes both remainders
    def test_4():
        merge_sort = ns.get('merge_sort')
        if not merge_sort:
            raise Exception("merge_sort not found")
        r1 = merge_sort([5, 3, 1, 2, 4])
        return r1 == [1, 2, 3, 4, 5]
    results.append(safe_test(test_4, TEST_NAMES[4]))

    # Test 6: merge_sort returns sorted array
    def test_5():
        merge_sort = ns.get('merge_sort')
        if not merge_sort:
            raise Exception("merge_sort not found")
        arr = [8, 3, 7, 1, 5, 9, 2, 6, 4]
        r1 = merge_sort(arr)
        return r1 == sorted(arr)
    results.append(safe_test(test_5, TEST_NAMES[5]))

    # Test 7: count_comparisons returns count not 0
    def test_6():
        count_comparisons = ns.get('count_comparisons')
        if not count_comparisons:
            raise Exception("count_comparisons not found")
        r1 = count_comparisons([1, 2, 3, 4, 5], 3)
        r2 = count_comparisons([1, 2, 3, 4, 5], 1)
        return r1 == 3 and r2 == 1
    results.append(safe_test(test_6, TEST_NAMES[6]))

    # Test 8: is_sorted correctly checks order
    def test_7():
        is_sorted = ns.get('is_sorted')
        if not is_sorted:
            raise Exception("is_sorted not found")
        r1 = is_sorted([1, 2, 3, 4, 5])
        r2 = is_sorted([5, 4, 3, 2, 1])
        r3 = is_sorted([5, 4, 3, 2, 1], ascending=False)
        r4 = is_sorted([1, 2, 3, 2, 5])
        return r1 == True and r2 == False and r3 == True and r4 == False
    results.append(safe_test(test_7, TEST_NAMES[7]))

    # Test 9: find_max returns maximum not minimum
    def test_8():
        find_max = ns.get('find_max')
        if not find_max:
            raise Exception("find_max not found")
        r1 = find_max([3, 1, 4, 1, 5, 9, 2, 6])
        r2 = find_max([7, 2, 8, 4])
        r3 = find_max([])
        return r1 == 9 and r2 == 8 and r3 is None
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
