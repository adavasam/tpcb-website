"""Replace a maintained file only after its new contents are fully written.

Path.write_text truncates the target first, so an error part-way through
(disk full, an interrupted run) leaves a fragment where the bibliography or
index used to be. Writing a sibling temporary file and renaming it over the
target means a failure leaves the original untouched.

This guards against an interrupted write. It does not fsync, so it makes no
promise about power loss, and it does not detect a concurrent editor.
"""
import os
import stat
import tempfile


def write_text_atomic(path, text):
    path = os.fspath(path)
    try:
        mode = stat.S_IMODE(os.stat(path).st_mode)
    except FileNotFoundError:
        umask = os.umask(0)
        os.umask(umask)
        mode = 0o666 & ~umask
    directory = os.path.dirname(os.path.abspath(path))
    fd, tmp = tempfile.mkstemp(dir=directory, prefix='.' + os.path.basename(path) + '.', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            handle.write(text)
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise
