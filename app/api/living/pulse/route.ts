import { database,json,validOrigin } from '@/lib/store';
import { learnCompleted,tickLiving,advanceResidentSocial } from '@/lib/living/service';
import { runCoalescedPulse } from '@/lib/living/pulse-gate';
import {env} from 'cloudflare:workers';
import {runPulsePipeline} from '@/lib/living/pulse-pipeline';
import {systemLog,safeErrorType} from '@/lib/system-log';
import {pulseSharedGround,preflightSharedGround} from '@/lib/living/shared-ground-store';
export async function POST(req: Request) {
  if (!validOrigin(req)) {
    return json({ error: 'Origin không hợp lệ', code: 'PULSE_ORIGIN_REJECTED' }, 403);
  }

  try {
    const local = (env as unknown as Record<string, string>).XOM_LOCAL_ADMIN === 'true' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(new URL(req.url).hostname);
    let sharedActive = false;
    if (local) {
      try {
        sharedActive = await preflightSharedGround(database());
      } catch {
        return json({ error: 'Journal chuyển động chưa sẵn sàng; world được giữ nguyên.' }, 503);
      }
    }

    const result = await runCoalescedPulse(database(), () => runPulsePipeline({learning:learnCompleted,social:advanceResidentSocial,tick:tickLiving}));
    systemLog('pulse_result',{status:result.status,duplicate:result.data.duplicate,coalesced:result.data.coalesced});

    if (sharedActive) {
      try {
        const shared = await pulseSharedGround(database());
        if (shared) return json({ ...result.data, sharedGround: shared }, result.status);
      } catch {
        return json({ error: 'Timeline chung chưa cập nhật; checkpoint đã lưu được giữ nguyên.' }, 503);
      }
    }
    return json(result.data, result.status);
  } catch (error) {
    systemLog('pulse_result',{status:503,errorType:safeErrorType(error)});
    return json({ error: 'Không thể cập nhật nhịp sống. Hãy kiểm tra nhật ký Worker.', code: 'PULSE_RUNTIME_ERROR' }, 503);
  }
}
