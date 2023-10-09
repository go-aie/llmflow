# -*- coding: utf-8 -*-

import sys
import traceback
from types import SimpleNamespace

import AccessControl
from AccessControl.SimpleObjectPolicies import allow_type
import RestrictedPython
from flask import Flask, request, abort, json, jsonify
from munch import Munch, munchify as _munchify
from werkzeug.exceptions import HTTPException


class MyMunch(Munch):
    # Allow to use setattr and delattr.
    _guarded_writes = True

# Allow to use all methods and attributes of MyMunch (and Munch).
allow_type(MyMunch)

munchify = lambda ctx: _munchify(ctx, MyMunch)


app = Flask(__name__)
json.provider.DefaultJSONProvider.ensure_ascii = False


@app.route('/eval', methods=['POST'])
def eval_expr():
    data = request.get_json()
    if 'expr' not in data:
        abort(400, description='expr is required')
    if 'ctx' not in data:
        abort(400, description='ctx is required')

    globals = dict(
        **AccessControl.get_safe_globals(),
        ctx=munchify(data['ctx']),
    )

    try:
        code = RestrictedPython.compile_restricted(data['expr'], '<inline>', 'eval')
        result = eval(code, globals)
    except Exception as exc:
        abort(500, description=format_exception_with_traceback(exc))

    return jsonify(dict(result=result))


@app.route('/exec', methods=['POST'])
def exec_func():
    data = request.get_json()
    if 'func' not in data:
        abort(400, description='func is required')
    if 'ctx' not in data:
        abort(400, description='ctx is required')

    globals = AccessControl.get_safe_globals()
    locals = {}

    try:
        code = RestrictedPython.compile_restricted(data['func'], '<inline>', 'exec')
        exec(code, globals, locals)
    except Exception as exc:
        abort(500, description=format_exception_with_traceback(exc))

    func = locals.get('_')
    if func is None:
        abort(400, description='found no func named "_"')

    try:
        result = func(munchify(data['ctx']))
    except Exception as exc:
        abort(500, description=format_exception_with_traceback(exc))

    return jsonify(dict(result=result))


@app.errorhandler(HTTPException)
def handle_exception(e):
    return jsonify(error=e.description), e.code


def format_exception_with_traceback(exc):
    return ''.join(traceback.TracebackException.from_exception(exc).format())


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) #, debug=True)
