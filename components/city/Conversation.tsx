"use client";
import {useEffect, useRef, useState} from 'react';
import {MessageCircle, Send} from 'lucide-react';

export function Conversation({actorId,name,paused}:{actorId:string;name:string;paused:boolean}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reply,setReply]=useState(''),[error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null),section=useRef<HTMLElement>(null),sending=useRef(false);
  const pending=useRef<{id:string;actorId:string;message:string}|null>(null),controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>{controller.current?.abort();},[]);
  async function send(text:string) {
    if(sending.current||paused||!text.trim())return;
    const normalized=text.trim();
    if(pending.current?.actorId!==actorId||pending.current.message!==normalized)pending.current={id:crypto.randomUUID(),actorId,message:normalized};
    const request=pending.current;
    sending.current=true;setBusy(true);setError('');
    const active=new AbortController();controller.current=active;
    const timeout=window.setTimeout(()=>active.abort(),10000);
    try {
      const response=await fetch('/api/living/interact',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify(request),signal:active.signal,
      });
      const data=await response.json().catch(()=>null) as {error?:string;reply?:string;id?:string;actorId?:string;message?:string}|null;
      if(!response.ok)throw Error(data?.error??'Chưa gửi được lời nhắn. Hãy thử lại.');
      if(typeof data?.reply!=='string'||!data.reply.trim()||data.id!==request.id||data.actorId!==request.actorId||data.message!==request.message)throw Error('Chưa xác nhận được câu trả lời. Lời nhắn của bạn vẫn được giữ lại.');
      pending.current=null;setReply(data.reply);setMessage('');
    } catch(e) {
      setError(e instanceof Error&&e.name!=='TypeError'&&e.name!=='TimeoutError'&&e.name!=='AbortError'?e.message:'Mất kết nối khi gửi lời nhắn. Nội dung vẫn được giữ lại.');
    } finally {
      window.clearTimeout(timeout);if(controller.current===active)controller.current=null;
      sending.current=false;setBusy(false);
      // Keep typing continuous, but never steal focus if the visitor moved elsewhere.
      if(document.activeElement===document.body||section.current?.contains(document.activeElement))input.current?.focus({preventScroll:true});
    }
  }
  return <section ref={section} className="conversation">
    <h3><MessageCircle size={20}/><span>Trò chuyện với {name}</span></h3>
    <p>Hỏi thăm công việc, dự định hoặc chuyện {name} còn nhớ.</p>
    <div className="chat-suggestions">{['Bạn đang làm gì?','Bạn có dự định gì?','Bạn còn nhớ chuyện gì?'].map(text=><button key={text} disabled={busy||paused} onClick={()=>void send(text)}>{text}</button>)}</div>
    <form aria-busy={busy} onSubmit={e=>{e.preventDefault();void send(message);}}>
      <label className="sr-only" htmlFor="visitor-message">Lời nhắn cho {name}</label>
      <input ref={input} id="visitor-message" value={message} maxLength={280} onChange={e=>setMessage(e.target.value)} placeholder={`Chào ${name}…`} disabled={paused} readOnly={busy}/>
      <button aria-label="Gửi lời nhắn" disabled={paused||busy||!message.trim()}><Send size={19}/></button>
    </form>
    {busy&&<p role="status">Đang gửi lời nhắn…</p>}
    {reply&&<blockquote aria-live="polite"><b>{name}</b><p>{reply}</p></blockquote>}
    {error&&<p role="alert">{error}</p>}
    {paused&&<p>Thành phố đang tạm nghỉ. Nhấn nút Tiếp tục trước nhé.</p>}
    <small>Phản hồi theo bối cảnh và luật · Có lưu cuộc trò chuyện · Chưa dùng mô hình ngôn ngữ.</small>
  </section>;
}
