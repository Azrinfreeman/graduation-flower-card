#!/usr/bin/env python3
"""Local development server for the card.

Use this instead of `python -m http.server`. It does the same job, but it also understands
HTTP "Range" requests. Chrome and Edge need those to jump around inside the song, so with
the plain server the seek bar would snap back to the start. (Cloudflare Pages supports
Range requests, so the live site is not affected.)

Usage (from the project folder):   python tools/serve.py          -> http://localhost:8000
                                   python tools/serve.py 8080     -> http://localhost:8080
"""
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class RangeHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler plus single-range support ("Range: bytes=start-end")."""

    def send_head(self):
        range_header = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not range_header or not os.path.isfile(path):
            return super().send_head()
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', range_header.strip())
        size = os.path.getsize(path)
        if not match or not (match.group(1) or match.group(2)):
            return super().send_head()
        if match.group(1):
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else size - 1
        else:  # "bytes=-500" means the last 500 bytes
            start = max(0, size - int(match.group(2)))
            end = size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_error(416, 'Requested Range Not Satisfiable')
            return None
        file = open(path, 'rb')
        file.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        self._remaining = end - start + 1
        return file

    def copyfile(self, source, outputfile):
        remaining = getattr(self, '_remaining', None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self._remaining = None

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(RangeHandler, directory=ROOT)
    with ThreadingHTTPServer(('127.0.0.1', port), handler) as server:
        print(f'Serving {ROOT} at http://localhost:{port}  (Ctrl+C to stop)')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nStopped.')
