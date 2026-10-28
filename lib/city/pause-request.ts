/** A write is confirmed only by the endpoint's acknowledgement, never by optimism. */
export class PauseRequestError extends Error {
  readonly kind: 'forbidden' | 'conflict' | 'server' | 'network' | 'invalid';
  constructor(kind: PauseRequestError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function requestPause(revision: number, paused: boolean, send: typeof fetch = fetch) {
  let response: Response;
  try {
    response = await send('/api/world', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revision, paused }), signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new PauseRequestError('network', 'Mất kết nối, chưa xác nhận được thay đổi. Kiểm tra lại trạng thái trước khi thử lại.');
  }
  if (response.status === 403) throw new PauseRequestError('forbidden', 'Bạn chưa có quyền điều khiển nhịp sống. Hãy mở bằng tài khoản chủ sở hữu.');
  if (response.status === 409) throw new PauseRequestError('conflict', 'Trạng thái vừa thay đổi. Đã yêu cầu cập nhật; hãy kiểm tra rồi thử lại.');
  if (response.status >= 500) throw new PauseRequestError('server', 'Máy chủ chưa xác nhận thay đổi nhịp sống. Hãy kiểm tra lại trạng thái.');
  let ack: unknown;
  try { ack = await response.json(); } catch { /* A login page or broken response is not confirmation. */ }
  if (!response.ok || !ack || typeof ack !== 'object' || !('ok' in ack) || ack.ok !== true) {
    throw new PauseRequestError('invalid', 'Chưa xác nhận được thay đổi nhịp sống. Hãy kiểm tra lại trạng thái.');
  }
}
