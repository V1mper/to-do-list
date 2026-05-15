#!/usr/bin/env python3
"""Запуск backend (порт 8000) и frontend (порт 3000) одной командой."""

import os
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

BACKEND_CMD = "uvicorn main:app --reload --port 8000"
FRONTEND_CMD = "python -m http.server 3000"


def _windows_start():
    backend_dir = str(BACKEND).replace("/", "\\")
    frontend_dir = str(FRONTEND).replace("/", "\\")
    subprocess.Popen(
        f'start "To-Do Backend" cmd /k "cd /d {backend_dir} && {BACKEND_CMD}"',
        shell=True,
    )
    subprocess.Popen(
        f'start "To-Do Frontend" cmd /k "cd /d {frontend_dir} && {FRONTEND_CMD}"',
        shell=True,
    )
    print("Запущены два окна терминала:")
    print("  Backend:  http://127.0.0.1:8000  (API, /docs)")
    print("  Frontend: http://127.0.0.1:3000")
    print("Закройте окна терминалов, чтобы остановить серверы.")


def _unix_start():
    procs = []
    try:
        procs.append(
            subprocess.Popen(
                BACKEND_CMD,
                shell=True,
                cwd=BACKEND,
                preexec_fn=os.setsid,
            )
        )
        procs.append(
            subprocess.Popen(
                FRONTEND_CMD,
                shell=True,
                cwd=FRONTEND,
                preexec_fn=os.setsid,
            )
        )
        print("Серверы запущены (Ctrl+C — остановить оба):")
        print("  Backend:  http://127.0.0.1:8000")
        print("  Frontend: http://127.0.0.1:3000")
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        print("\nОстановка...")
    finally:
        for p in procs:
            if p.poll() is None:
                try:
                    os.killpg(os.getpgid(p.pid), signal.SIGTERM)
                except (ProcessLookupError, PermissionError):
                    p.terminate()


def main():
    if not BACKEND.is_dir() or not FRONTEND.is_dir():
        print("Ошибка: не найдены папки backend или frontend.", file=sys.stderr)
        sys.exit(1)
    if sys.platform == "win32":
        _windows_start()
    else:
        _unix_start()


if __name__ == "__main__":
    main()
