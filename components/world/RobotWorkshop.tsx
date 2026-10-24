'use client';

import { useState } from 'react';
import type { Person } from '@/lib/world';
import { Robot, type RobotMotion } from './Robot';
import { SpeechBubble } from './SpeechBubble';

const WORKSHOP_MOTIONS: readonly [RobotMotion, string][] = [
  ['idle', 'Đứng nghỉ'],
  ['walk', 'Đi bộ'],
  ['work', 'Làm việc'],
  ['garden', 'Tưới cây'],
  ['social', 'Vẫy tay'],
] as const;

const SAMPLE_LINES = [
  'Mình đang thử một ý tưởng mới. Bạn xem giúp mình nhé?',
  'Để mình kiểm tra lại các con số rồi cùng làm tiếp nhé.',
  'Mình tưới rau xong rồi. Cùng nghỉ một chút không?',
];

const SAMPLE_CAPTIONS = [
  'An · Thợ sáng chế / kính quang học',
  'Bình · Thủ thư / cảm biến quang tâm',
  'Chi · Chăm vườn / vỏ gốm sinh thái',
];

export function RobotWorkshop({ people }: { people: Person[] }) {
  const [motion, setMotion] = useState<RobotMotion>('walk');
  const [talk, setTalk] = useState(false);

  return (
    <section className="robot-workshop">
      <div className="section-title">
        <div>
          <h2>Xưởng nhân vật</h2>
          <p>Minh họa cử động · không ghi sự kiện vào thế giới</p>
        </div>
      </div>
      <div className="workshop-controls">
        {WORKSHOP_MOTIONS.map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMotion(m)}
            aria-pressed={motion === m}
          >
            {label}
          </button>
        ))}
        <button onClick={() => setTalk(!talk)} aria-pressed={talk}>
          Lời thoại mẫu
        </button>
      </div>
      <div className="robot-lineup">
        {people.map((p, i) => (
          <div key={p.id}>
            <svg
              viewBox="-140 -220 280 300"
              role="img"
              aria-label={`Minh họa robot ${p.name} ${motion}`}
            >
              <g transform="translate(0 12) scale(1.2)">
                <Robot person={p} motion={motion} speaking={talk} />
              </g>
              {talk && (
                <SpeechBubble
                  speech={{
                    speaker: p.id,
                    key: `demo-${p.id}`,
                    source: 'routine',
                    text: SAMPLE_LINES[i] ?? SAMPLE_LINES[0],
                  }}
                />
              )}
            </svg>
            <b>{p.name}</b>
            <p>{SAMPLE_CAPTIONS[i] ?? SAMPLE_CAPTIONS[0]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
