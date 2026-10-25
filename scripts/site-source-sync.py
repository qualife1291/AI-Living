"""Sites Git transport with ephemeral credentials on hidden stdin, never on disk/argv.
Usage: python3 scripts/site-source-sync.py fetch|push
Native create_source_repository_write_credential supplies the JSON; do not paste in logs.
Run fetch before edits and review upstream. Push refuses non-fast-forward updates.
"""
import sys, json, os, subprocess, termios
operation = sys.argv[1]
if operation not in ('fetch', 'push'):
    raise SystemExit('fetch or push required')
if sys.stdin.isatty():
    settings = termios.tcgetattr(sys.stdin)
    settings[3] &= ~termios.ECHO
    termios.tcsetattr(sys.stdin, termios.TCSANOW, settings)
print('Ready for Site credential JSON on stdin (input is hidden).', flush=True)
credential = json.loads(sys.stdin.readline())
env = os.environ.copy()
if credential.get('auth_mode') == 'http_extra_header':
    n = int(env.get('GIT_CONFIG_COUNT', '0'))
    env.update({f'GIT_CONFIG_KEY_{n}': 'http.extraHeader', f'GIT_CONFIG_VALUE_{n}': 'Authorization: Bearer ' + credential['token'], 'GIT_CONFIG_COUNT': str(n+1)})
elif credential.get('auth_mode') != 'work_proxy':
    raise SystemExit('Unsupported authentication mode')
env['GIT_TERMINAL_PROMPT'] = '0'
branch = credential['branch']
ref = branch + ':refs/remotes/sites/' + branch if operation == 'fetch' else 'HEAD:refs/heads/' + branch
result = subprocess.run(['git', operation, credential['remote_url'], ref], env=env, capture_output=True, text=True)
# Only status and commit are reported. Git transport errors may contain server data.
print(json.dumps({'operation': operation, 'returncode': result.returncode, 'commit_sha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()}))
raise SystemExit(result.returncode)
