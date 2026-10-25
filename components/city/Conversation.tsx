"use client";
import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
export function Conversation({actorId,name,paused}:{actorId:string;name:string;paused:boolean}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reply,setReply]=useState(''),[error,setError]=useState('');
 async function send(text:string){
  if(busy||!text.trim())return;setBusy(true);setError('');
  try{const r=await fetch('/api/living/interact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),actorId,message:text}),signal:AbortSignal.timeout(10000)});const d=(await r.json()) as {error?:string;reply:string};if(!r.ok)throw Error(d.error??'Chưa gửi được lời nhắn.');setReply(d.reply);setMessage('');}
  catch(e){setError(e instanceof Error?e.message:'Lỗi gửi lời nhắn.');}finally{setBusy(false);}
 }
 return <section className="conversation"><h3><MessageCircle size={20}/><span>Trò chuyện với {name}</span></h3><p>Hỏi thăm công việc, dự định hoặc chuyện {name} còn nhớ.</p><div className="chat-suggestions">{['Bạn đang làm gì?','Bạn có dự định gì?','Bạn còn nhớ chuyện gì?'].map(text=><button key={text} disabled={busy||paused} onClick={()=>void send(text)}>{text}</button>)}</div><form onSubmit={e=>{e.preventDefault();void send(message);}}><label className="sr-only" htmlFor="visitor-message">Lời nhắn cho {name}</label><input id="visitor-message" value={message} maxLength={280} onChange={e=>setMessage(e.target.value)} placeholder={`Chào ${name}…`} disabled={paused||busy}/><button aria-label="Gửi lời nhắn" disabled={paused||busy||!message.trim()}><Send size={19}/></button></form>{busy&&<p role="status">Đang gửi lời nhắn…</p>}{reply&&<blockquote aria-live="polite"><b>{name}</b><p>{reply}</p></blockquote>}{error&&<p role="alert">{error}</p>}{paused&&<p>Thành phố đang tạm nghỉ. Nhấn nút Tiếp tục trước nhé.</p>}<small>Phản hồi theo bối cảnh và luật · Có lưu cuộc trò chuyện · Chưa dùng mô hình ngôn ngữ.</small></section>;
}
