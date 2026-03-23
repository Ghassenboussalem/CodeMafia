import json, sys, threading

TIMEOUT = 4

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
    # If right = len(arr) (bug), arr[mid] can be out of bounds or search is wrong
    try:
        binary_search = ns.get('binary_search')
        if not binary_search:
            raise Exception("binary_search not found")
        # Correct: find existing elements
        r1 = binary_search([1, 3, 5, 7, 9], 1)   # index 0
        r2 = binary_search([1, 3, 5, 7, 9], 5)   # index 2
        r3 = binary_search([1, 3, 5, 7, 9], 9)   # index 4
        r4 = binary_search([1, 3, 5, 7, 9], 6)   # not found → -1
        results.append({"name": TEST_NAMES[0], "passed": bool(
            r1 == 0 and r2 == 2 and r3 == 4 and r4 == -1
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: binary_search pointers advance correctly (no infinite loop, correct results)
    try:
        binary_search = ns.get('binary_search')
        if not binary_search:
            raise Exception("binary_search not found")
        r1 = binary_search([2, 4, 6, 8, 10, 12], 10)   # index 4
        r2 = binary_search([2, 4, 6, 8, 10, 12], 2)    # index 0
        r3 = binary_search([2, 4, 6, 8, 10, 12], 7)    # not found
        results.append({"name": TEST_NAMES[1], "passed": bool(
            r1 == 4 and r2 == 0 and r3 == -1
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: search_all searches from index 0 (includes first element)
    try:
        search_all = ns.get('search_all')
        if not search_all:
            raise Exception("search_all not found")
        # With bug (arr[1:]), index 0 match is missed and indices are off by 1
        r1 = search_all([5, 1, 2, 1, 3], 5)   # should find index 0
        r2 = search_all([1, 2, 3, 2, 1], 2)   # should find indices 1 and 3
        results.append({"name": TEST_NAMES[2], "passed": bool(
            0 in r1 and sorted(r2) == [1, 3]
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: merge_sort comparison uses <= (stable sort with duplicates)
    try:
        merge_sort = ns.get('merge_sort')
        if not merge_sort:
            raise Exception("merge_sort not found")
        # With < bug, equal elements may be lost or misplaced
        r1 = merge_sort([3, 1, 2, 2, 1])
        results.append({"name": TEST_NAMES[3], "passed": bool(r1 == [1, 1, 2, 2, 3])})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: merge includes both remainders
    try:
        merge_sort = ns.get('merge_sort')
        if not merge_sort:
            raise Exception("merge_sort not found")
        r1 = merge_sort([5, 3, 1, 2, 4])
        results.append({"name": TEST_NAMES[4], "passed": bool(r1 == [1, 2, 3, 4, 5])})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: merge_sort returns sorted array (larger input)
    try:
        merge_sort = ns.get('merge_sort')
        if not merge_sort:
            raise Exception("merge_sort not found")
        arr = [8, 3, 7, 1, 5, 9, 2, 6, 4]
        r1 = merge_sort(arr)
        results.append({"name": TEST_NAMES[5], "passed": bool(r1 == sorted(arr))})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: count_comparisons returns count not 0
    try:
        count_comparisons = ns.get('count_comparisons')
        if not count_comparisons:
            raise Exception("count_comparisons not found")
        r1 = count_comparisons([1, 2, 3, 4, 5], 3)   # stops at index 2 → count = 3
        r2 = count_comparisons([1, 2, 3, 4, 5], 1)   # stops at index 0 → count = 1
        results.append({"name": TEST_NAMES[6], "passed": bool(r1 == 3 and r2 == 1)})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: is_sorted correctly checks order
    try:
        is_sorted = ns.get('is_sorted')
        if not is_sorted:
            raise Exception("is_sorted not found")
        r1 = is_sorted([1, 2, 3, 4, 5])              # ascending → True
        r2 = is_sorted([5, 4, 3, 2, 1])              # ascending → False
        r3 = is_sorted([5, 4, 3, 2, 1], ascending=False)  # descending → True
        r4 = is_sorted([1, 2, 3, 2, 5])              # not sorted → False
        results.append({"name": TEST_NAMES[7], "passed": bool(
            r1 == True and r2 == False and r3 == True and r4 == False
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: find_max returns maximum not minimum
    try:
        find_max = ns.get('find_max')
        if not find_max:
            raise Exception("find_max not found")
        r1 = find_max([3, 1, 4, 1, 5, 9, 2, 6])   # max = 9
        r2 = find_max([7, 2, 8, 4])                 # max = 8
        r3 = find_max([])                            # empty → None
        results.append({"name": TEST_NAMES[8], "passed": bool(
            r1 == 9 and r2 == 8 and r3 is None
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
