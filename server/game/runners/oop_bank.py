import json, sys, threading

TIMEOUT = 4

TEST_NAMES = [
    "validate_amount rejects negatives",
    "is_active returns False gracefully",
    "close_account deactivates account",
    "deposit adds to balance",
    "withdraw checks sufficient funds",
    "get_balance returns exact balance",
    "get_transactions filters by type",
    "transaction_count returns correct count",
    "last_transaction returns last item",
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
        'RuntimeError': RuntimeError, 'Exception': Exception,
        'print': print, 'isinstance': isinstance,
        'hasattr': hasattr, 'getattr': getattr,
        'super': super,
    }

    ns = {'__builtins__': safe_builtins}
    try:
        exec(compile(code, '<player>', 'exec'), ns)
    except Exception as e:
        return [{"name": t, "passed": False, "error": f"Exec error: {e}"} for t in TEST_NAMES]

    if 'BankAccount' not in ns:
        return [{"name": t, "passed": False, "error": "BankAccount class not found"} for t in TEST_NAMES]

    BankAccount = ns['BankAccount']
    results = []

    # Test 1: validate_amount rejects negatives
    try:
        acc = BankAccount('Alice', 100)
        raised_neg = False
        raised_pos = False
        try:
            acc.validate_amount(-5)
        except Exception:
            raised_neg = True
        try:
            acc.validate_amount(10)
        except Exception:
            raised_pos = True
        results.append({"name": TEST_NAMES[0], "passed": bool(raised_neg and not raised_pos)})
    except Exception as e:
        results.append({"name": TEST_NAMES[0], "passed": False, "error": str(e)})

    # Test 2: is_active returns False gracefully (no exception after close)
    try:
        acc = BankAccount('Bob', 100)
        acc.close_account()
        raised = False
        result = None
        try:
            result = acc.is_active()
        except Exception:
            raised = True
        results.append({"name": TEST_NAMES[1], "passed": bool(not raised and result == False)})
    except Exception as e:
        results.append({"name": TEST_NAMES[1], "passed": False, "error": str(e)})

    # Test 3: close_account deactivates account
    try:
        acc = BankAccount('Carol', 100)
        acc.close_account()
        results.append({"name": TEST_NAMES[2], "passed": bool(acc.active == False)})
    except Exception as e:
        results.append({"name": TEST_NAMES[2], "passed": False, "error": str(e)})

    # Test 4: deposit adds to balance
    try:
        acc = BankAccount('Dave', 100)
        acc.deposit(50)
        bal = acc.get_balance()
        results.append({"name": TEST_NAMES[3], "passed": bool(bal == 150)})
    except Exception as e:
        results.append({"name": TEST_NAMES[3], "passed": False, "error": str(e)})

    # Test 5: withdraw checks sufficient funds
    try:
        acc = BankAccount('Eve', 100)
        result = acc.withdraw(200)
        bal = acc.get_balance()
        results.append({"name": TEST_NAMES[4], "passed": bool(result == False and bal == 100)})
    except Exception as e:
        results.append({"name": TEST_NAMES[4], "passed": False, "error": str(e)})

    # Test 6: get_balance returns exact balance
    try:
        acc = BankAccount('Frank', 0)
        acc.deposit(100)
        bal = acc.get_balance()
        results.append({"name": TEST_NAMES[5], "passed": bool(bal == 100)})
    except Exception as e:
        results.append({"name": TEST_NAMES[5], "passed": False, "error": str(e)})

    # Test 7: get_transactions filters by type
    try:
        acc = BankAccount('Grace', 200)
        acc.deposit(50)
        acc.withdraw(20)
        acc.deposit(30)
        deposits = acc.get_transactions('deposit')
        withdrawals = acc.get_transactions('withdraw')
        all_txns = acc.get_transactions()
        results.append({"name": TEST_NAMES[6], "passed": bool(
            len(deposits) == 2 and len(withdrawals) == 1 and len(all_txns) == 3
        )})
    except Exception as e:
        results.append({"name": TEST_NAMES[6], "passed": False, "error": str(e)})

    # Test 8: transaction_count returns correct count
    try:
        acc = BankAccount('Hank', 100)
        acc.deposit(10)
        acc.deposit(20)
        acc.withdraw(5)
        results.append({"name": TEST_NAMES[7], "passed": bool(acc.transaction_count() == 3)})
    except Exception as e:
        results.append({"name": TEST_NAMES[7], "passed": False, "error": str(e)})

    # Test 9: last_transaction returns last item
    try:
        acc = BankAccount('Ivy', 100)
        acc.deposit(50)
        acc.withdraw(25)
        last = acc.last_transaction()
        results.append({"name": TEST_NAMES[8], "passed": bool(last == ('withdraw', 25))})
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
