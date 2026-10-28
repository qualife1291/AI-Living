import { database,json,validOrigin } from '@/lib/store';
import { learnCompleted,tickLiving,advanceResidentSocial } from '@/lib/living/service';
import { runCoalescedPulse } from '@/lib/living/pulse-gate';
import {env} from 'cloudflare:workers';
import {pulseSharedGround,preflightSharedGround} from '@/lib/living/shared-ground-store';
export async function POST(req: Request) {
  if (!validOrigin(req)) {
    console.warn('living_pulse_origin_rejected', { origin: req.headers.get('origin'), target: new URL(req.url).origin });
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

    const result = await runCoalescedPulse(database(), async () => {
      const learned = await learnCompleted();
      if (learned.status !== 200) return learned;
      const social = await advanceResidentSocial();
      if (social.status !== 200) return social;
      const tick = await tickLiving();
      return { status: tick.status, data: { ...tick.data, learning: learned.data } };
    });

    if (result.status !== 200 && result.status !== 409) {
      console.warn('living_pulse_rejected', { status: result.status, error: result.data.error });
    }

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
    console.error('living_pulse_failed', error);
    return json({ error: 'Không thể cập nhật nhịp sống. Hãy kiểm tra nhật ký Worker.', code: 'PULSE_RUNTIME_ERROR' }, 503);
  }
}
