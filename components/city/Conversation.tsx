"use client";
import {useRef, useState} from 'react';
import {MessageCircle, Send} from 'lucide-react';

export function Conversation({actorId,name,paused}:{actorId:string;name:string;paused:boolean}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reply,setReply]=useState(''),[error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null),section=useRef<HTMLElement>(null),sending=useRef(false);
  async function send(text:string) {
    if(sending.current||paused||!text.trim())return;
    sending.current=true;setBusy(true);setError('');
    try {
      const response=await fetch('/api/living/interact',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({id:crypto.randomUUID(),actorId,message:text}),signal:AbortSignal.timeout(10000),
      });
      const data=await response.json().catch(()=>null) as {error?:string;reply?:string}|null;
      if(!response.ok)throw Error(data?.error??'Chưa gửi được lời nhắn. Hãy thử lại.');
      if(typeof data?.reply!=='string'||!data.reply.trim())throw Error('Chưa xác nhận được câu trả lời. Lời nhắn của bạn vẫn được giữ lại.');
      setReply(data.reply);setMessage('');
    } catch(e) {
      setError(e instanceof Error&&e.name!=='TypeError'&&e.name!=='TimeoutError'?e.message:'Mất kết nối khi gửi lời nhắn. Nội dung vẫn được giữ lại.');
    } finally {
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
