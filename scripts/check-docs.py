"""Check tracked Markdown inline local paths and heading anchors; never fetch URLs."""
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

LINK = re.compile(r'!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)')


def prose_lines(text):
    fence = None
    for number, line in enumerate(text.splitlines(), 1):
        marker = re.match(r'^\s*(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            continue
        if fence is None:
            yield number, line


def heading_ids(text):
    result = set()
    for _, line in prose_lines(text):
        match = re.match(r'^#{1,6}\s+(.+?)\s*#*$', line)
        if not match:
            continue
        title = re.sub(r'<[^>]*>', '', match.group(1)).lower()
        title = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', title)
        slug = re.sub(r'[^\w -]', '', title).replace(' ', '-')
        base, count = slug, 0
        while slug in result:
            count += 1
            slug = f'{base}-{count}'
        result.add(slug)
    result.update(re.findall(r'\bid=["\']([^"\']+)["\']', text))
    return result


def check_documents(root, files):
    errors, headings = [], {}
    for relative in files:
        file = root / relative
        if not file.is_file():
            errors.append(f'{relative}: tracked document is missing')
            continue
        for number, line in prose_lines(file.read_text(encoding='utf-8')):
            line = re.sub(r'`+[^`]*`+', '', line)
            for match in LINK.finditer(line):
                target = match.group(1).strip('<>')
                url = urlsplit(target)
                if url.scheme or url.netloc:
                    continue
                destination = file
                if url.path:
                    base = root if url.path.startswith('/') else file.parent
                    destination = base / unquote(url.path).lstrip('/')
                if not destination.exists():
                    errors.append(f'{relative}:{number}: missing path {target}')
                elif url.fragment and destination.suffix.lower() == '.md':
                    if destination not in headings:
                        headings[destination] = heading_ids(destination.read_text(encoding='utf-8'))
                    if unquote(url.fragment) not in headings[destination]:
                        errors.append(f'{relative}:{number}: missing heading {target}')
    return errors


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    files = subprocess.check_output(['git', 'ls-files', '-z', '--', '*.md'], cwd=root).decode().split('\0')
    files = [file for file in files if file]
    errors = check_documents(root, files)
    for error in errors:
        print(error, file=sys.stderr)
    print(f'Checked {len(files)} Markdown files; {len(errors)} local path/anchor errors')
    sys.exit(bool(errors))
