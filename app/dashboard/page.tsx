'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  House,
  BookOpen,
  Users,
  Settings,
  Sun,
  Pause,
  Play,
  RefreshCw,
  ArrowUpRight,
  Heart,
  Leaf,
  Clock,
  ChevronRight,
  Download,
  Check,
  CloudSun,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { LivingPanel } from '@/components/living/LivingPanel';
import { Avatar } from '@/components/world/Robot';
import { RobotWorkshop } from '@/components/world/RobotWorkshop';
import { CityMap as Map } from '@/components/world/CityMap';
import type { World, EpisodeEvent } from '@/lib/world';
import type { ContextCard } from '@/lib/training';
import {
  neighborhoodContexts,
  goldenEpisodes,
  dpoPreferencePairs,
  selfPlayCurriculum,
} from '@/lib/training';
import type { WorldTime, WeatherState } from '@/lib/clock';

type TabId = 'home' | 'people' | 'journal' | 'settings';

type WorldApiResponse = {
  revision: number;
  serverNow?: string;
  world: World;
  events: EpisodeEvent[];
  worldTime?: WorldTime;
  weatherState?: WeatherState;
  activeContexts?: ContextCard[];
};

const NAV_ITEMS: readonly [TabId, string, LucideIcon][] = [
  ['home', 'Ngắm xóm', House],
  ['people', 'Cư dân', Users],
  ['journal', 'Nhật ký', BookOpen],
  ['settings', 'Nhịp sống', Settings],
];

const RESIDENT_NAMES: Record<string, string> = {
  an: 'An',
  binh: 'Bình',
  chi: 'Chi',
};

function formatVnClock(date = new Date()): string {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

export default function Page() {
  const [data, setData] = useState<WorldApiResponse | null>(null);
  const [selected, setSelected] = useState('an');
  const [tab, setTab] = useState<TabId>('home');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clock, setClock] = useState(() => formatVnClock());
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/world');
      if (!r.ok) throw new Error('Chưa đọc được dữ liệu của xóm.');
      const json = (await r.json()) as WorldApiResponse;
      if (json.serverNow) {
        setClockOffsetMs(Date.parse(json.serverNow) - Date.now());
      }
      setData(json);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi kết nối dữ liệu.');
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void load();
      setClock(formatVnClock());
    }, 0);
    const id = setInterval(() => {
      void load();
    }, 60_000);
    const t = setInterval(() => {
      setClock(formatVnClock());
    }, 30_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(id);
      clearInterval(t);
    };
  }, [load]);

  async function pause() {
    if (!data) return;
    setBusy(true);
    try {
      const r = await fetch('/api/world', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          revision: data.revision,
          paused: !data.world.paused,
        }),
      });
      if (!r.ok) {
        const body = (await r.json()) as { error?: string };
        throw new Error(body.error ?? 'Không cập nhật được trạng thái.');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi thao tác.');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!data) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    a.download = 'xom-ai-nhat-ky.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const w = data?.world;
  const p = w?.people.find((person) => person.id === selected);
  const refMs = data?.serverNow ? Date.parse(data.serverNow) : null;
  const days =
    w && refMs
      ? Math.max(1, Math.floor((refMs - Date.parse(w.born)) / 86_400_000) + 1)
      : (data?.worldTime?.dayIndex ?? 0) + 1;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <House size={24} />
          </span>
          <span>
            Xóm AI<small>CHUYỆN NHỎ MỖI NGÀY</small>
          </span>
        </Link>
        <div className="nav-label">GÓC CỦA BẠN</div>
        <nav>
          {NAV_ITEMS.map(([id, label, Icon]) => (
            <button
              className={tab === id ? 'active' : ''}
              key={id}
              onClick={() => setTab(id)}
            >
              <Icon size={19} />
              {label}
              {id === 'people' && <span>03</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={23} />
          <p>
            Mỗi ngày một chút,
            <br />
            chúng mình cùng lớn lên.
          </p>
          <span>Một thế giới nhỏ, nhiều câu chuyện.</span>
        </div>
        <div className="private">
          <span />
          Không gian riêng của bạn
        </div>
      </aside>

      <main>
        <header>
          <div className="breadcrumb">
            Xóm AI <ChevronRight size={14} />{' '}
            {tab === 'home'
              ? 'Ngắm xóm'
              : tab === 'people'
                ? 'Cư dân'
                : tab === 'journal'
                  ? 'Nhật ký'
                  : 'Nhịp sống'}
          </div>
          <div className="header-right">
            <span className="live-dot" />
            {!w
              ? 'Đang kết nối'
              : w.paused
                ? 'Đang tạm nghỉ'
                : 'Thế giới đã lưu'}
            <button className="icon-btn" onClick={load} aria-label="Làm mới">
              <RefreshCw size={17} />
            </button>
            <div className="owner">L</div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CHÀO MỪNG VỀ NHÀ</div>
              <h1>
                {tab === 'home'
                  ? 'Một ngày ở xóm mình.'
                  : tab === 'people'
                    ? 'Những người bạn cùng xóm.'
                    : tab === 'journal'
                      ? 'Chuyện hôm nay, nhớ ngày mai.'
                      : 'Để xóm lớn lên từng chút.'}
              </h1>
              <p>
                Ba trí tuệ nhỏ, một khu phố rộng mở. Và những câu chuyện đang
                tiếp nối.
              </p>
            </div>
            <div className="day-pill">
              <Sun size={18} />
              <span>
                Ngày {days}
                <small>
                  {clock} · {data?.worldTime?.phaseLabel ?? 'Việt Nam'}
                </small>
              </span>
            </div>
          </div>

          {error && (
            <div className="error">
              {error}
              <button onClick={load}>Thử lại</button>
            </div>
          )}

          {!w ? (
            <div className="loading">
              <Leaf />
              Đang mở cánh cửa nhỏ của xóm…
            </div>
          ) : (
            <>
              {tab === 'home' && (
                <div className="dashboard">
                  <LivingPanel onUpdated={load} />
                  <section className="scene-card">
                    <div className="card-top">
                      <div>
                        <span className="live-dot" />
                        <b>Khu phố AI</b>
                        <span className="muted">· {3 + (w.living?.residents.length ?? 0)} cư dân</span>
                      </div>
                      <span className="weather">
                        <CloudSun size={17} />
                        {data?.weatherState?.label ?? w.weather}
                      </span>
                    </div>
                    <Map
                      world={w}
                      selected={selected}
                      onSelect={setSelected}
                      events={data!.events}
                      clockOffsetMs={clockOffsetMs}
                    />
                    <div className="scene-footer">
                      <span>
                        <span className="live-dot" />
                        {w.paused
                          ? 'Tạm nghỉ các lượt AI'
                          : 'Sinh hoạt theo lượt · ký ức được lưu'}
                      </span>
                      <button disabled={busy} onClick={pause}>
                        {w.paused ? <Play size={14} /> : <Pause size={14} />}{' '}
                        {w.paused ? 'Tiếp tục' : 'Tạm nghỉ'}
                      </button>
                    </div>
                  </section>

                  <section className="person-panel">
                    <div className="section-caption">
                      HỒ SƠ ĐÃ LƯU <Heart size={15} />
                    </div>
                    <div className="people-tabs">
                      {w.people.map((person) => (
                        <button
                          className={
                            selected === person.id ? 'selected' : ''
                          }
                          onClick={() => setSelected(person.id)}
                          key={person.id}
                        >
                          <Avatar person={person} />
                          <span>{person.name}</span>
                        </button>
                      ))}
                    </div>
                    {p && (
                      <>
                        <h2>
                          {p.name}
                          <span>{p.role}</span>
                        </h2>
                        <div className="activity">
                          <span className="live-dot" />
                          {p.activity}
                          <small>{p.location} · Trạng thái đã lưu</small>
                        </div>
                        <p className="bio">
                          {p.bio.replace(/\d+ tuổi · /, 'Robot AI · ')}
                        </p>
                        <div className="meters">
                          {(
                            [
                              ['Năng lượng', p.energy, '#8ba17b'],
                              ['Độ no', 100 - p.hunger, '#d4ab76'],
                              ['Kỹ năng', p.skill, '#9babc4'],
                            ] as const
                          ).map(([label, n, color]) => (
                            <div key={label}>
                              <div>
                                {label}
                                <span>{n}/100</span>
                              </div>
                              <div className="track">
                                <i
                                  style={{
                                    width: n + '%',
                                    background: String(color),
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="goal">
                          <span>ĐIỀU ĐANG ẤP Ủ</span>
                          <p>{p.goal}</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setTab('people')}
                        >
                          Ghé thăm thế giới của {p.name}
                          <ArrowUpRight size={16} />
                        </button>
                      </>
                    )}
                  </section>

                  <section className="latest">
                    <div className="section-title">
                      <h2>
                        Chuyện mới trong xóm{' '}
                        <span>{data!.events.length}</span>
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => setTab('journal')}
                      >
                        Xem nhật ký <ChevronRight size={15} />
                      </button>
                    </div>
                    {data!.events.length ? (
                      data!.events.slice(0, 3).map((e) => (
                        <button
                          className="event-row"
                          onClick={() => {
                            setTab('journal');
                            setExpanded(e.id);
                          }}
                          key={e.id}
                        >
                          <div className="event-icon">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <b>{e.title}</b>
                            <p>{e.summary}</p>
                          </div>
                          <small>
                            {new Date(e.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Ho_Chi_Minh',
                            })}
                          </small>
                        </button>
                      ))
                    ) : (
                      <div className="empty">
                        Xóm vừa mở cửa. Những cuộc trò chuyện đầu tiên sẽ được
                        lưu ở đây.
                      </div>
                    )}
                  </section>

                  <section className="little-card">
                    <Leaf size={25} />
                    <h3>Mọi chuyện đều để lại một điều gì đó.</h3>
                    <p>
                      Một lời hứa, một bữa cơm, một lần giúp đỡ. Ký ức hôm nay
                      sẽ theo các bạn đến ngày mai.
                    </p>
                    <span>
                      {w.relationships.length} mối quan hệ ·{' '}
                      {neighborhoodContexts.length} bối cảnh tổng hợp
                    </span>
                  </section>
                </div>
              )}

              {tab === 'people' && (
                <div className="residents">
                  <RobotWorkshop people={w.people} />
                  {w.people.map((person) => (
                    <section className="resident" key={person.id}>
                      <Avatar person={person} size={74} />
                      <h2>{person.name}</h2>
                      <span>{person.role}</span>
                      <p>{person.bio.replace(/\d+ tuổi · /, 'Robot AI · ')}</p>
                      <div className="goal">
                        <span>MỤC TIÊU</span>
                        <p>{person.goal}</p>
                      </div>
                      <div className="money">
                        {person.money.toLocaleString('vi-VN')}đ{' '}
                        <small>tiền trong thế giới mô phỏng</small>
                      </div>
                      <h3>Những điều còn nhớ</h3>
                      <ul>
                        {person.memories
                          .slice(-8)
                          .reverse()
                          .map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                      </ul>
                    </section>
                  ))}
                  <section className="relationships">
                    <h2>Sợi dây kết nối</h2>
                    {w.relationships.map((r) => (
                      <div key={r.a + r.b}>
                        <b>
                          {RESIDENT_NAMES[r.a]} & {RESIDENT_NAMES[r.b]}
                        </b>
                        <p>{r.note}</p>
                        <div className="track">
                          <i
                            style={{
                              width: r.trust + '%',
                              background: '#8ba17b',
                            }}
                          />
                        </div>
                        <small>Tin tưởng · {r.trust}/100</small>
                      </div>
                    ))}
                  </section>
                </div>
              )}

              {tab === 'journal' && (
                <section className="journal">
                  <div className="section-title">
                    <h2>Nhật ký cuộc sống</h2>
                    <button className="secondary" onClick={download}>
                      <Download size={16} />
                      Tải nhật ký
                    </button>
                  </div>
                  {data!.events.length === 0 && (
                    <div className="empty">
                      Chưa có sự kiện. Cả xóm đang làm quen với ngôi nhà mới.
                    </div>
                  )}
                  {data!.events.map((e) => (
                    <article key={e.id}>
                      <div className="event-meta">
                        <Clock size={14} />
                        {new Date(e.createdAt).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                        <span>
                          {e.source === 'ai' ? 'Lượt AI' : 'Cảnh mở đầu'}
                        </span>
                      </div>
                      <button
                        className="journal-title"
                        onClick={() =>
                          setExpanded(expanded === e.id ? null : e.id)
                        }
                      >
                        <h2>{e.title}</h2>
                        <ChevronRight size={20} />
                      </button>
                      <p>{e.summary}</p>
                      {(expanded === e.id || data!.events.length === 1) && (
                        <div className="dialogue">
                          {e.dialogue.map((d, i) => (
                            <div key={i}>
                              <Avatar
                                person={
                                  w.people.find(
                                    (person) => person.id === d.speaker,
                                  )!
                                }
                                size={36}
                              />
                              <div>
                                <b>{RESIDENT_NAMES[d.speaker]}</b>
                                <p>{d.text}</p>
                              </div>
                            </div>
                          ))}
                          <div className="outcome">
                            <Check size={16} />
                            Ký ức và thay đổi đã được lưu vào thế giới.
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              )}

              {tab === 'settings' && (
                <section className="settings">
                  <h2>Nhịp sống của Xóm AI</h2>
                  <p>
                    Thế giới tiếp nối qua các lượt sinh hoạt. Mỗi lượt AI đọc
                    trạng thái, đồng hồ thế giới, bối cảnh gợi ý và ký ức trước
                    khi tạo câu chuyện mới.
                  </p>
                  <div className="setting-row">
                    <div>
                      <b>Hoạt động của xóm</b>
                      <p>
                        {w.paused
                          ? 'Các lượt AI đang tạm dừng.'
                          : 'Cho phép các lượt AI cập nhật thế giới.'}
                      </p>
                    </div>
                    <button
                      className="secondary"
                      onClick={pause}
                      disabled={busy}
                    >
                      {w.paused ? 'Tiếp tục' : 'Tạm nghỉ'}
                    </button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <b>Lịch AI</b>
                      <p>{w.schedule}</p>
                    </div>
                    <Clock size={21} />
                  </div>
                  <div className="setting-row">
                    <div>
                      <b>Lượt AI gần nhất</b>
                      <p>
                        {w.lastAI
                          ? new Date(w.lastAI).toLocaleString('vi-VN', {
                              timeZone: 'Asia/Ho_Chi_Minh',
                            })
                          : 'Chưa có lượt AI tự động.'}
                      </p>
                    </div>
                    <Leaf size={21} />
                  </div>
                  <div className="setting-row">
                    <div>
                      <b>Bộ tổng hợp bối cảnh & dữ liệu tự đánh giá AI</b>
                      <p>
                        {neighborhoodContexts.length} bối cảnh đa chiều ·{' '}
                        {goldenEpisodes.length} mẫu Golden Episodes (SFT) ·{' '}
                        {dpoPreferencePairs.length} cặp đối chiếu DPO ·{' '}
                        {selfPlayCurriculum.length} cấp độ Self-Play Curriculum.
                      </p>
                    </div>
                    <Sparkles size={21} />
                  </div>
                  {data?.activeContexts && data.activeContexts.length > 0 && (
                    <div className="setting-row">
                      <div>
                        <b>Bối cảnh gợi ý theo giờ & thời tiết hiện tại</b>
                        <p>
                          {data.activeContexts
                            .map((c) => `${c.title} (${c.locations.join(', ')})`)
                            .join(' · ')}
                        </p>
                      </div>
                      <CloudSun size={21} />
                    </div>
                  )}
                  <div className="setting-row">
                    <div>
                      <b>Dữ liệu được lưu trên máy chủ</b>
                      <p>
                        Nhân vật, ký ức, quan hệ và lịch sử. Bản tải về chứa tối
                        đa 80 sự kiện gần nhất.
                      </p>
                    </div>
                    <button className="secondary" onClick={download}>
                      <Download size={16} />
                      Tải dữ liệu
                    </button>
                  </div>
                  <div className="notice">
                    <b>Về chế độ miễn phí & mô phỏng</b>
                    <p>
                      Không tích hợp API tính phí hay xuất video. Lượt AI theo
                      lịch sử dụng tác vụ định kỳ và phụ thuộc hạn mức tài
                      khoản; nhân vật không suy nghĩ liên tục 24/7 giữa các
                      lượt. Chuyển động trên bản đồ là hoạt cảnh mô phỏng tất
                      định theo đồng hồ thế giới.
                    </p>
                  </div>
                </section>
              )}

              <footer>
                <span>
                  <Leaf size={13} /> Xóm AI · Chuyện nhỏ mỗi ngày
                </span>
                <span>Được chăm chút, từng chút một.</span>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
